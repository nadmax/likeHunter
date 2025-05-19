import { TextChannel, Message } from 'discord.js';
import cron from 'node-cron';
import { client } from './client'
import { fetchMessagesSince } from './fetchMessagesSince';
import { sendInChunks } from './sendInChunks';
import { formatReport } from './reportFormatter';


export function weeklyReports(guildID: string, linkedInChannelID: string, destinationChannelID: string) {
    cron.schedule('30 22 * * 5', async () => {
        const guild = await client.guilds.fetch(guildID);
        await guild.members.fetch();

        const postChannel = await client.channels.fetch(linkedInChannelID) as TextChannel;
        const destChannel = await client.channels.fetch(destinationChannelID) as TextChannel;

        // Calcul de la période (lundi 00h00 à vendredi 22h30)
        const now = new Date();
        const currentDay = now.getDay(); // 0 = dimanche, 1 = lundi, ..., 5 = vendredi
        const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1; // Nombre de jours à reculer pour atteindre lundi

        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - daysToSubtract);
        startOfWeek.setHours(0, 0, 0, 0);

        const messages = await fetchMessagesSince(postChannel, startOfWeek.getTime());
        console.log(`[DEBUG] Rapport hebdo : période analysée du ${startOfWeek.toISOString()} au ${now.toISOString()}`);

        // On ne garde que les messages avec un lien
        const urlRegex = /https?:\/\//;
        const filteredMessages = messages.filter(m => {
            const messageDate = new Date(m.createdTimestamp);
            const day = messageDate.getDay();
            // Ne garder que les jours de semaine (1-5)
            return urlRegex.test(m.content) && day >= 1 && day <= 5;
        });

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
        const postsByDate = new Map<string, { date: Date; posts: typeof postsStats }>();
        postsStats.forEach(p => {
            const date = new Date(p.msg.createdTimestamp);
            const key = date.toISOString().split('T')[0];
            if (!postsByDate.has(key)) {
                postsByDate.set(key, { date, posts: [] });
            }
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
        await sendInChunks(destChannel, dayLines);
    });
}