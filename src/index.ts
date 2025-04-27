import { Client, GatewayIntentBits, Partials, TextChannel, Message, Collection, EmbedBuilder } from 'discord.js';
import * as dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,                     // Permet de voir les salons du serveur
    GatewayIntentBits.GuildMembers, // nécessaire pour fetch des membres
    GatewayIntentBits.GuildMessages,               // Permet de lire les messages dans les salons
    GatewayIntentBits.MessageContent,              // Permet d'accéder au contenu des messages
  ],
  partials: [Partials.Channel],                   // Nécessaire pour recevoir certains types de messages (comme les messages supprimés)
});

// Log des événements debug, warn et error de discord.js
client.on('debug', info => console.debug('[debug]', info));
client.on('warn', warn => console.warn('[warn]', warn));
client.on('error', error => console.error('[error]', error));

client.once('ready', async () => {
  console.log(`✅ Bot connecté en tant que ${client.user?.tag}`);
  const GUILD_ID = process.env.GUILD_ID!;
  const LINKEDIN_CHANNEL_ID = process.env.LINKEDIN_CHANNEL_ID!;
  const MODERATOR_CHANNEL_ID = process.env.MODERATOR_CHANNEL_ID!;

  async function fetchMessagesSince(channel: TextChannel, since: number): Promise<Message[]> {
    const all: Message[] = [];
    let beforeId: string | undefined;
    while (true) {
      const options: any = { limit: 100 };
      if (beforeId) options.before = beforeId;
      const fetched = await channel.messages.fetch(options) as unknown;
      const msgs = fetched as Collection<string, Message>;
      const msgsArray = Array.from(msgs.values());
      const filtered = msgsArray.filter(m => m.createdTimestamp >= since);
      all.push(...filtered);
      if (msgsArray.length < 100 || msgsArray[msgsArray.length - 1].createdTimestamp < since) break;
      beforeId = msgsArray[msgsArray.length - 1].id;
    }
    return all;
  }

  // Fonction utilitaire pour envoyer un tableau de lignes en plusieurs messages si nécessaire
  async function sendInChunks(channel: TextChannel, lines: string[]) {
    let chunk = '';
    for (const line of lines) {
      // Si on dépasse environ 2000 caractères, on envoie le chunk courant
      if ((chunk + line + '\n').length > 1900) {
        await channel.send({ content: chunk });
        chunk = '';
      }
      chunk += line + '\n';
    }
    if (chunk.length > 0) {
      await channel.send({ content: chunk });
    }
  }

  cron.schedule('0 0 * * *', async () => {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.fetch();
    const postChannel = await client.channels.fetch(LINKEDIN_CHANNEL_ID) as TextChannel;
    const modChannel = await client.channels.fetch(MODERATOR_CHANNEL_ID) as TextChannel;

    const since = Date.now() - 24 * 60 * 60 * 1000;
    const messages = await fetchMessagesSince(postChannel, since);
    // Calcul des stats de réactions ✅ et 💬
    const postsStats: { count: number; userTags: string[]; userIds: string[] }[] = [];
    const countsPerUser: Record<string, number> = {};

    for (const msg of messages) {
      const checkReaction = msg.reactions.cache.get('✅');
      const speechReaction = msg.reactions.cache.get('💬');
      let userIds: string[] = [];
      if (checkReaction) {
        const users = await checkReaction.users.fetch();
        const ids = Array.from(users.values()).filter(u => !u.bot).map(u => u.id);
        userIds.push(...ids);
      }
      if (speechReaction) {
        const users = await speechReaction.users.fetch();
        const ids = Array.from(users.values()).filter(u => !u.bot).map(u => u.id);
        userIds.push(...ids);
      }
      // Uniques
      userIds = Array.from(new Set(userIds));
      const userTags = userIds.map(id => guild.members.cache.get(id)?.user.tag || id);
      postsStats.push({ count: userIds.length, userTags, userIds });
      for (const id of userIds) {
        countsPerUser[id] = (countsPerUser[id] || 0) + 1;
      }
    }

    // Identification des membres sans réaction
    const allMemberIds = guild.members.cache.filter(m => !m.user.bot).map(m => m.id);
    const reactedIds = Object.keys(countsPerUser);
    const noReactIds = allMemberIds.filter(id => !reactedIds.includes(id));
    const noReactTags = noReactIds.map(id => guild.members.cache.get(id)?.user.tag || id);

    // Construction du rapport
    const reportLines: string[] = ['📊 Statistiques pour #linkedin-posts'];
    postsStats.forEach((p, idx) => {
      reportLines.push(`post #${idx + 1}`);
      reportLines.push(`${p.count} intentions avec ${p.userTags.join(', ')}`);
    });
    reportLines.push('');
    reportLines.push(`Total de posts : ${postsStats.length}`);
    reportLines.push('');
    reportLines.push('Répartition par utilisateur ayant réagi :');
    Object.entries(countsPerUser).forEach(([id, c]) => {
      const tag = guild.members.cache.get(id)?.user.tag || id;
      reportLines.push(`- ${tag}: ${c}`);
    });
    reportLines.push('');
    reportLines.push('Membres sans réaction :');
    noReactTags.forEach(tag => reportLines.push(`- ${tag}`));

    // Envoi du rapport en chunks si trop long
    await sendInChunks(modChannel, reportLines);
  });

  // Commande manuelle !scan pour envoyer le rapport à la demande
  client.on('messageCreate', async message => {
    // Ne réagit à !scan que dans le salon #linkedin-posts
    if (message.channel.id !== LINKEDIN_CHANNEL_ID) return;
    console.log('[DEBUG] messageCreate détecté dans le bon salon :', message.channel.id, message.content);
    if (message.author.bot) return;
    if (message.content === '!scan') {
      console.log('[TRACE] Enter !scan handler — channel:', message.channel.id, 'user:', message.author.tag);
      const guild = await client.guilds.fetch(GUILD_ID);
      await guild.members.fetch();
      const postChannel = await client.channels.fetch(LINKEDIN_CHANNEL_ID) as TextChannel;
      const modChannel = await client.channels.fetch(MODERATOR_CHANNEL_ID) as TextChannel;

      // Messages des 7 derniers jours, filtrés pour ceux contenant un lien
      const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const allMessages = await fetchMessagesSince(postChannel, since);
      const urlRegex = /https?:\/\//;
      const filteredMessages = allMessages.filter(m => urlRegex.test(m.content));
      // Collecte des stats par post et globales
      const postsStats: { msg: Message; userIds: string[] }[] = [];
      const countsPerUser: Record<string, number> = {};
      for (const msg of filteredMessages) {
        const checkReaction = msg.reactions.cache.get('✅');
        const speechReaction = msg.reactions.cache.get('💬');
        let userIds: string[] = [];
        if (checkReaction) {
          const users = await checkReaction.users.fetch();
          userIds.push(...Array.from(users.values()).filter(u => !u.bot).map(u => u.id));
        }
        if (speechReaction) {
          const users = await speechReaction.users.fetch();
          userIds.push(...Array.from(users.values()).filter(u => !u.bot).map(u => u.id));
        }
        userIds = Array.from(new Set(userIds));
        postsStats.push({ msg, userIds });
        for (const id of userIds) {
          countsPerUser[id] = (countsPerUser[id] || 0) + 1;
        }
      }
      // Membres sans réaction
      const allMemberIds = guild.members.cache.filter(m => !m.user.bot).map(m => m.id);
      const noReactIds = allMemberIds.filter(id => !countsPerUser[id]);
      // Regroupement par jour
      const weekdayNames = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
      const postsByDate = new Map<string, { date: Date; posts: typeof postsStats }>();
      postsStats.forEach(p => {
        const date = new Date(p.msg.createdTimestamp);
        const key = date.toISOString().split('T')[0];
        if (!postsByDate.has(key)) postsByDate.set(key, { date, posts: [] });
        postsByDate.get(key)!.posts.push(p);
      });
      // Création des embeds par jour
      const dayEmbeds: EmbedBuilder[] = [];
      for (const { date, posts } of postsByDate.values()) {
        const weekday = weekdayNames[date.getDay()];
        const dateStr = `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
        const embed = new EmbedBuilder()
          .setTitle(`📅 ${weekday} ${dateStr} - ${posts.length} post${posts.length>1?'s':''}`)
          .setColor('DarkBlue');
        posts.forEach((p, idx) => {
          const reactionsCount = p.userIds.length;
          const mentions = p.userIds.map(id => `<@${id}>`).join(' ') || 'aucune réaction';
          embed.addFields({
            name: `Post ${idx+1} - ${reactionsCount} réaction${reactionsCount>1?'s':''}`,
            value: `[Voir le post](${p.msg.url})\n${mentions}`,
            inline: false
          });
        });
        dayEmbeds.push(embed);
      }
      // Embed répartition triée
      const distEntries = Object.entries(countsPerUser).sort((a,b) => b[1] - a[1]);
      const distEmbed = new EmbedBuilder()
        .setTitle('🔢 Top réacteurs')
        .setColor('Green');
      distEntries.forEach(([id, c]) => distEmbed.addFields({ name: `<@${id}>`, value: `${c}`, inline: true }));
      // Embed membres sans réaction
      const noReactEmbed = new EmbedBuilder()
        .setTitle('❌ Membres sans réaction')
        .setColor('Red');
      noReactIds.forEach(id => noReactEmbed.addFields({ name: `<@${id}>`, value: '\u200B', inline: true }));

      // Envoi des rapports
      try {
        // Envoi des rapports journaliers en texte chunké pour contourner la limite d'embeds
        const dayLines: string[] = [];
        for (const embed of dayEmbeds) {
          // Titre du jour
          dayLines.push(embed.data.title ?? '');
          // Détails des posts
          for (const field of embed.data.fields ?? []) {
            dayLines.push(`${field.name}: ${field.value}`);
          }
          dayLines.push(''); // ligne vide entre les jours
        }
        await sendInChunks(modChannel, dayLines);
        // Envoi du Top réacteurs en texte chunké (évite les embeds trop gros)
        const distLines = ['🔢 Top réacteurs', ...distEntries.map(([id, c]) => `- <@${id}>: ${c}`)];
        await sendInChunks(modChannel, distLines);
        // Envoi des Membres sans réaction en texte chunké
        const noReactLines = ['❌ Membres sans réaction', ...noReactIds.map(id => `- <@${id}>`)];
        await sendInChunks(modChannel, noReactLines);
        console.log('[TRACE] Embeds envoyés');
      } catch (err) {
        console.error('[ERROR] Impossible d\'envoyer les embeds :', err);
        await message.reply("Erreur : impossible d'envoyer les statistiques.");
      }
    }
  });
});

client.login(process.env.DISCORD_TOKEN);
