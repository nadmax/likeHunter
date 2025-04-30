import cron from 'node-cron';
import {client} from './client'
import { TextChannel, Message } from 'discord.js';
import { fetchMessagesSince } from './fetchMessagesSince';
import { sendInChunks } from './sendInChunks';

export function dailyReport (GUILD_ID: string, LINKEDIN_CHANNEL_ID: string, MODERATOR_CHANNEL_ID: string): void {

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
}