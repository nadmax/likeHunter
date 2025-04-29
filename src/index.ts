/**
 * LinkedIn Posts Discord Bot
 * Copyright (C) 2025 Xavier
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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

    // Début du jour courant à minuit UTC
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).getTime();
    const messages = await fetchMessagesSince(postChannel, startOfDay);
    // On ne garde que les messages avec un lien
    const urlRegex = /https?:\/\//;
    const filteredMessages = messages.filter(m => urlRegex.test(m.content));
    // On regroupe les posts par jour (normalement un seul jour ici, mais on garde la logique pour homogénéité)
    const postsStats: { msg: Message; userIds: string[] }[] = [];
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
    }
    // Regroupement par jour
    const weekdayNames = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
    const postsByDate = new Map<string, { date: Date; posts: typeof postsStats }>();
    postsStats.forEach(p => {
      const date = new Date(p.msg.createdTimestamp);
      const key = date.toISOString().split('T')[0];
      if (!postsByDate.has(key)) postsByDate.set(key, { date, posts: [] });
      postsByDate.get(key)!.posts.push(p);
    });
    // Création des rapports par jour avec le nouvel affichage
    const dayLines: string[] = [];
    for (const { date, posts } of postsByDate.values()) {
      const weekday = weekdayNames[date.getDay()];
      const dateStr = `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
      // Nombre de posts
      const nbPosts = posts.length;
      // Nombre total de réactions sur la journée
      let totalReactions = 0;
      const userReactionCount: Record<string, number> = {};
      posts.forEach(p => {
        totalReactions += p.userIds.length;
        p.userIds.forEach(id => {
          userReactionCount[id] = (userReactionCount[id] || 0) + 1;
        });
      });
      // Classement des participants (trié)
      const classement = Object.entries(userReactionCount).sort((a, b) => b[1] - a[1]);
      // Membres inactifs (ceux qui n'ont pas réagi ce jour-là)
      const allMemberIds = guild.members.cache.filter(m => !m.user.bot).map(m => m.id);
      const actifs = new Set(Object.keys(userReactionCount));
      const inactifs = allMemberIds.filter(id => !actifs.has(id));
      // Construction du texte
      dayLines.push(`\n📅 ${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${dateStr}`);
      dayLines.push(`- Nombre de posts publiés : ${nbPosts}`);
      dayLines.push(`- Nombre total de réactions : ${totalReactions}`);
      dayLines.push(`\n🏆 Classement des participants`);
      if (classement.length === 0) {
        dayLines.push('Aucun participant ce jour-là.');
      } else {
        classement.forEach(([id, c], idx) => {
          dayLines.push(`${idx + 1}. <@${id}> : ${c} réaction${c > 1 ? 's' : ''}`);
        });
      }
      dayLines.push(`\n👻 Membres inactifs`);
      if (inactifs.length === 0) {
        dayLines.push('Aucun membre inactif ce jour-là.');
      } else {
        inactifs.forEach(id => dayLines.push(`- <@${id}>`));
      }
      dayLines.push(''); // ligne vide entre les jours
    }
    await sendInChunks(modChannel, dayLines);
  });

  // Commande manuelle !scan pour envoyer le rapport à la demande
  client.on('messageCreate', async message => {
    console.log('[DEBUG] Message reçu:', message.content, 'dans le salon:', message.channel.id);

    if (message.channel.id !== MODERATOR_CHANNEL_ID) {
      console.log('[DEBUG] Mauvais salon. Attendu:', MODERATOR_CHANNEL_ID, 'Reçu:', message.channel.id);
      return;
    }

    if (message.author.bot) {
      console.log('[DEBUG] Message ignoré car provient d\'un bot');
      return;
    }

    if (message.content === '!scan jour' || message.content === '!scan semaine') {
      console.log('[DEBUG] Commande scan détectée:', message.content);

      // Vérification du rôle "Le_Dalleu"
      const member = await message.guild?.members.fetch(message.author.id);
      if (!member?.roles.cache.some(role => role.name.toLowerCase() === 'le_dalleu')) {
        console.log('[DEBUG] Utilisateur sans le rôle Le_Dalleu');
        await message.reply("⛔ Seuls les administrateurs peuvent utiliser cette commande.");
        return;
      }

      console.log('[DEBUG] Début du scan...');
      const guild = await client.guilds.fetch(GUILD_ID);
      await guild.members.fetch();
      const postChannel = await client.channels.fetch(LINKEDIN_CHANNEL_ID) as TextChannel;
      const modChannel = await client.channels.fetch(MODERATOR_CHANNEL_ID) as TextChannel;

      // Détermination de la période à scanner
      let since: number;
      let description: string;
      if (message.content === '!scan jour') {
        // Les 24 dernières heures à partir de maintenant
        const now = new Date();
        since = now.getTime() - 24 * 60 * 60 * 1000;
        description = "Statistiques des dernières 24h";
        console.log(`[DEBUG] ${description} - messages filtrés:`);
      } else if (message.content === '!scan semaine') {
        // Début de la semaine (vendredi précédent à 18h)
        const now = new Date();
        const day = now.getDay();
        const daysSinceFriday = (day + 7 - 5) % 7; // 5 = vendredi
        const lastFriday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceFriday, 18, 0, 0, 0);
        since = lastFriday.getTime();
        description = "Statistiques de la semaine";
        console.log(`[DEBUG] ${description} - messages filtrés:`);
      }
      // Récupération des messages
      const allMessages = await fetchMessagesSince(postChannel, since!);
      const urlRegex = /https?:\/\//;
      const filteredMessages = allMessages.filter(m => urlRegex.test(m.content));
      console.log('[DEBUG] nombre de messages filtrés:', filteredMessages.length);
      if (filteredMessages.length === 0) {
        await message.reply("Aucun post avec lien trouvé pour cette période.");
        return;
      }
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
      // Regroupement par jour
      const weekdayNames = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
      const postsByDate = new Map<string, { date: Date; posts: typeof postsStats }>();
      postsStats.forEach(p => {
        const date = new Date(p.msg.createdTimestamp);
        const key = date.toISOString().split('T')[0];
        if (!postsByDate.has(key)) postsByDate.set(key, { date, posts: [] });
        postsByDate.get(key)!.posts.push(p);
      });
      // Affichage détaillé par jour
      const dayLines: string[] = [];
      let totalWeekPosts = 0;
      let totalWeekReactions = 0;
      const weekUserReactionCount: Record<string, number> = {};
      for (const { date, posts } of postsByDate.values()) {
        const weekday = weekdayNames[date.getDay()];
        const dateStr = `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
        const nbPosts = posts.length;
        let totalReactions = 0;
        const userReactionCount: Record<string, number> = {};
        posts.forEach(p => {
          totalReactions += p.userIds.length;
          totalWeekReactions += p.userIds.length;
          totalWeekPosts++;
          p.userIds.forEach(id => {
            userReactionCount[id] = (userReactionCount[id] || 0) + 1;
            weekUserReactionCount[id] = (weekUserReactionCount[id] || 0) + 1;
          });
        });
        const classement = Object.entries(userReactionCount).sort((a, b) => b[1] - a[1]);
        const allMemberIds = guild.members.cache.filter(m => !m.user.bot).map(m => m.id);
        const actifs = new Set(Object.keys(userReactionCount));
        const inactifs = allMemberIds.filter(id => !actifs.has(id));
        dayLines.push(`\n📅 ${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${dateStr}`);
        dayLines.push(`- Nombre de posts publiés : ${nbPosts}`);
        dayLines.push(`- Nombre total de réactions : ${totalReactions}`);
        dayLines.push(`\n🏆 Classement des participants`);
        if (classement.length === 0) {
          dayLines.push('Aucun participant ce jour-là.');
        } else {
          classement.forEach(([id, c], idx) => {
            dayLines.push(`${idx + 1}. <@${id}> : ${c} réaction${c > 1 ? 's' : ''}`);
          });
        }
        dayLines.push(`\n👻 Membres inactifs`);
        if (inactifs.length === 0) {
          dayLines.push('Aucun membre inactif ce jour-là.');
        } else {
          inactifs.forEach(id => dayLines.push(`- <@${id}>`));
        }
        dayLines.push('');
      }
      // Récap global semaine uniquement pour !scan semaine
      if (message.content === '!scan semaine') {
        dayLines.push('\n============================');
        dayLines.push('**Récapitulatif de la semaine**');
        dayLines.push(`- Nombre total de posts : ${totalWeekPosts}`);
        dayLines.push(`- Nombre total de réactions : ${totalWeekReactions}`);
        // Classement global semaine
        const classementSemaine = Object.entries(weekUserReactionCount).sort((a, b) => b[1] - a[1]);
        dayLines.push(`\n🏆 Classement des participants (semaine)`);
        if (classementSemaine.length === 0) {
          dayLines.push('Aucun participant cette semaine.');
        } else {
          classementSemaine.forEach(([id, c], idx) => {
            dayLines.push(`${idx + 1}. <@${id}> : ${c} réaction${c > 1 ? 's' : ''}`);
          });
        }
        // Membres inactifs semaine
        const allMemberIds = guild.members.cache.filter(m => !m.user.bot).map(m => m.id);
        const actifsSemaine = new Set(Object.keys(weekUserReactionCount));
        const inactifsSemaine = allMemberIds.filter(id => !actifsSemaine.has(id));
        dayLines.push(`\n👻 Membres inactifs (semaine)`);
        if (inactifsSemaine.length === 0) {
          dayLines.push('Aucun membre inactif cette semaine.');
        } else {
          inactifsSemaine.forEach(id => dayLines.push(`- <@${id}>`));
        }
        dayLines.push('============================');
      }
      await sendInChunks(modChannel, dayLines);
    }
  });

  cron.schedule('0 18 * * 5', async () => {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.fetch();
    const postChannel = await client.channels.fetch(LINKEDIN_CHANNEL_ID) as TextChannel;
    const modChannel = await client.channels.fetch(MODERATOR_CHANNEL_ID) as TextChannel;

    // Début de la semaine (vendredi précédent à 18h)
    const now = new Date();
    const day = now.getDay();
    const daysSinceFriday = (day + 7 - 5) % 7; // 5 = vendredi
    const lastFriday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceFriday, 18, 0, 0, 0);
    const startOfWeek = lastFriday.getTime();
    const messages = await fetchMessagesSince(postChannel, startOfWeek);
    // On ne garde que les messages avec un lien
    const urlRegex = /https?:\/\//;
    const filteredMessages = messages.filter(m => urlRegex.test(m.content));
    // On regroupe les posts par jour
    const postsStats: { msg: Message; userIds: string[] }[] = [];
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
    }
    // Regroupement par jour
    const weekdayNames = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
    const postsByDate = new Map<string, { date: Date; posts: typeof postsStats }>();
    postsStats.forEach(p => {
      const date = new Date(p.msg.createdTimestamp);
      const key = date.toISOString().split('T')[0];
      if (!postsByDate.has(key)) postsByDate.set(key, { date, posts: [] });
      postsByDate.get(key)!.posts.push(p);
    });
    // Affichage détaillé par jour
    const dayLines: string[] = [];
    let totalWeekPosts = 0;
    let totalWeekReactions = 0;
    const weekUserReactionCount: Record<string, number> = {};
    for (const { date, posts } of postsByDate.values()) {
      const weekday = weekdayNames[date.getDay()];
      const dateStr = `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
      const nbPosts = posts.length;
      let totalReactions = 0;
      const userReactionCount: Record<string, number> = {};
      posts.forEach(p => {
        totalReactions += p.userIds.length;
        totalWeekReactions += p.userIds.length;
        totalWeekPosts++;
        p.userIds.forEach(id => {
          userReactionCount[id] = (userReactionCount[id] || 0) + 1;
          weekUserReactionCount[id] = (weekUserReactionCount[id] || 0) + 1;
        });
      });
      const classement = Object.entries(userReactionCount).sort((a, b) => b[1] - a[1]);
      const allMemberIds = guild.members.cache.filter(m => !m.user.bot).map(m => m.id);
      const actifs = new Set(Object.keys(userReactionCount));
      const inactifs = allMemberIds.filter(id => !actifs.has(id));
      dayLines.push(`\n📅 ${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${dateStr}`);
      dayLines.push(`- Nombre de posts publiés : ${nbPosts}`);
      dayLines.push(`- Nombre total de réactions : ${totalReactions}`);
      dayLines.push(`\n🏆 Classement des participants`);
      if (classement.length === 0) {
        dayLines.push('Aucun participant ce jour-là.');
      } else {
        classement.forEach(([id, c], idx) => {
          dayLines.push(`${idx + 1}. <@${id}> : ${c} réaction${c > 1 ? 's' : ''}`);
        });
      }
      dayLines.push(`\n👻 Membres inactifs`);
      if (inactifs.length === 0) {
        dayLines.push('Aucun membre inactif ce jour-là.');
      } else {
        inactifs.forEach(id => dayLines.push(`- <@${id}>`));
      }
      dayLines.push('');
    }
    // Récap global semaine
    dayLines.push('\n============================');
    dayLines.push('**Récapitulatif de la semaine**');
    dayLines.push(`- Nombre total de posts : ${totalWeekPosts}`);
    dayLines.push(`- Nombre total de réactions : ${totalWeekReactions}`);
    // Classement global semaine
    const classementSemaine = Object.entries(weekUserReactionCount).sort((a, b) => b[1] - a[1]);
    dayLines.push(`\n🏆 Classement des participants (semaine)`);
    if (classementSemaine.length === 0) {
      dayLines.push('Aucun participant cette semaine.');
    } else {
      classementSemaine.forEach(([id, c], idx) => {
        dayLines.push(`${idx + 1}. <@${id}> : ${c} réaction${c > 1 ? 's' : ''}`);
      });
    }
    // Membres inactifs semaine
    const allMemberIds = guild.members.cache.filter(m => !m.user.bot).map(m => m.id);
    const actifsSemaine = new Set(Object.keys(weekUserReactionCount));
    const inactifsSemaine = allMemberIds.filter(id => !actifsSemaine.has(id));
    dayLines.push(`\n👻 Membres inactifs (semaine)`);
    if (inactifsSemaine.length === 0) {
      dayLines.push('Aucun membre inactif cette semaine.');
    } else {
      inactifsSemaine.forEach(id => dayLines.push(`- <@${id}>`));
    }
    dayLines.push('============================');
    await sendInChunks(modChannel, dayLines);
  });
});

client.login(process.env.DISCORD_TOKEN);
