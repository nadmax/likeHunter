import { TextChannel, Message } from 'discord.js';
import cron from 'node-cron';
import {client} from './client'
import { fetchMessagesSince } from './fetchMessagesSince';
import { sendInChunks } from './sendInChunks';
import { formatReport } from './reportFormatter';




export function weeklyReports(GUILD_ID:string, LINKEDIN_CHANNEL_ID:string, MODERATOR_CHANNEL_ID:string ) {
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
        // Calcul des stats globales semaine
        let totalWeekPosts = 0;
        let totalWeekReactions = 0;
        const weekUserReactionCount: Record<string, number> = {};
        for (const { posts } of postsByDate.values()) {
          posts.forEach(p => {
            totalWeekPosts++;
            totalWeekReactions += p.userIds.length;
            p.userIds.forEach(id => {
              weekUserReactionCount[id] = (weekUserReactionCount[id] || 0) + 1;
            });
          });
        }
        const dayLines = formatReport({
          guild,
          postsByDate,
          weekUserReactionCount,
          totalWeekPosts,
          totalWeekReactions,
          isWeeklyRecap: true
        });
        await sendInChunks(modChannel, dayLines);
      });
}