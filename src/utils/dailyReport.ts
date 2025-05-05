import cron from 'node-cron';
import {client} from './client'
import { TextChannel, Message } from 'discord.js';
import { fetchMessagesSince } from './fetchMessagesSince';
import { sendInChunks } from './sendInChunks';
import { formatReport } from './reportFormatter';

export function dailyReport (GUILD_ID: string, LINKEDIN_CHANNEL_ID: string, MODERATOR_CHANNEL_ID: string): void {

cron.schedule('30 4 * * *', async () => {
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
      let userIds: string[] = [];
      if (checkReaction) {
        const users = await checkReaction.users.fetch();
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
    const dayLines = formatReport({ guild, postsByDate });
    await sendInChunks(modChannel, dayLines);
  });
}