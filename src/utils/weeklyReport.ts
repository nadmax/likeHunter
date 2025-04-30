import { TextChannel, Message } from 'discord.js';
import cron from 'node-cron';
import {client} from './client'
import { fetchMessagesSince } from './fetchMessagesSince';
import { sendInChunks } from './sendInChunks';




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
}