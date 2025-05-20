import { Guild, Message } from 'discord.js';
import { getHolidaysList } from './holidays';

export type PostStat = { msg: Message; userIds: string[] };

export interface ReportFormatterOptions {
    guild: Guild;
    postsByDate: Map<string, { date: Date; posts: PostStat[] }>;
    weekUserReactionCount?: Record<string, number>;
    totalWeekPosts?: number;
    totalWeekReactions?: number;
    isWeeklyRecap?: boolean;
}

export function formatReport({
    guild,
    postsByDate,
    weekUserReactionCount = {},
    totalWeekPosts = 0,
    totalWeekReactions = 0,
    isWeeklyRecap = false,
}: ReportFormatterOptions): string[] {
    const weekdayNames = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
    const dayLines: string[] = [];

    // Calcul des likes reçus par chaque membre
    const likesReceived: Record<string, number> = {};
    for (const { posts } of postsByDate.values()) {
        posts.forEach(p => {
            const authorId = p.msg.author.id;
            likesReceived[authorId] = (likesReceived[authorId] || 0) + p.userIds.length;
        });
    }

    for (const { date, posts } of postsByDate.values()) {
        const weekday = weekdayNames[date.getDay()];
        const dateStr = `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
        const nbPosts = posts.length;
        let totalReactions = 0;
        const userReactionCount: Record<string, number> = {};
        posts.forEach(p => {
            totalReactions += p.userIds.length;
            p.userIds.forEach(id => {
                userReactionCount[id] = (userReactionCount[id] || 0) + 1;
            });
        });

        const ranking = Object.entries(userReactionCount).sort((a, b) => b[1] - a[1]);
        const allMemberIds = guild.members.cache.filter(m => !m.user.bot).map(m => m.id);
        const vacances = getHolidaysList();
        const actifs = new Set(Object.keys(userReactionCount));
        const inactifs = allMemberIds.filter(id => !actifs.has(id) && !vacances.includes(id));

        dayLines.push(`\n📅 ${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${dateStr}`);
        dayLines.push(`- Nombre de posts publiés : ${nbPosts}`);
        dayLines.push(`- Nombre total de réactions : ${totalReactions}`);
        dayLines.push(`Nombres de membres sur le serveur : ${allMemberIds.length}`);

        // Légende des indicateurs
        dayLines.push('\n📊 Légende des indicateurs :');
        dayLines.push('💩 : Reçoit plus de likes qu\'il n\'en donne (ratio < 0.5)');
        dayLines.push('❤️ : Donne plus de likes qu\'il n\'en reçoit (ratio > 2)');
        dayLines.push('➖ : Ratio équilibré (entre 0.5 et 2)');
        dayLines.push('👻 : Membre inactif (aucun like donné)');

        dayLines.push(`\n🏆 Classement des ${actifs.size} participants`);
        if (ranking.length === 0) {
            dayLines.push('Aucun participant ce jour-là.');
        } else {
            let lastScore: number | null = null;
            let lastRank = 0;
            let realRank = 0;
            let currentGroup: string[] = [];
            ranking.forEach(([id, c]) => {
                realRank++;
                if (c !== lastScore) {
                    if (currentGroup.length > 0) {
                        dayLines.push(`position ${lastRank}`);
                        dayLines.push(...currentGroup);
                        currentGroup = [];
                    }
                    lastRank = realRank;
                    lastScore = c;
                }
                const memberLikesReceived = likesReceived[id] || 0;
                const ratio = (c + 1) / (memberLikesReceived + 1);
                const status = c === 0 ? '👻' :
                             ratio < 0.5 ? '💩' :
                             ratio > 2 ? '❤️' : '➖';
                currentGroup.push(`${status} <@${id}> : ${c} likes donnés (reçus: ${memberLikesReceived}, ratio: ${ratio.toFixed(2)})`);
            });
            if (currentGroup.length > 0) {
                dayLines.push(`position ${lastRank}`);
                dayLines.push(...currentGroup);
            }
        }

        dayLines.push(`\n👻 ${inactifs.length} Membres inactifs`);
        if (inactifs.length === 0) {
            dayLines.push('Aucun membre inactif ce jour-là.');
        } else {
            inactifs.forEach((id: string) => dayLines.push(`- <@${id}>`));
        }

        // Affichage des vacanciers
        const holidaymakers = allMemberIds.filter(id => vacances.includes(id));
        dayLines.push(`\n🌴 ${holidaymakers.length} Membres en vacances`);
        if (holidaymakers.length === 0) {
            dayLines.push('Aucun membre en vacances ce jour-là.');
        } else {
            holidaymakers.forEach((id: string) => dayLines.push(`- <@${id}>`));
        }

        dayLines.push('');
    }

    // === Section récapitulatif hebdo ===
    if (isWeeklyRecap) {
        const allMemberIds = guild.members.cache.filter(m => !m.user.bot).map(m => m.id);
        const holidays = getHolidaysList();
        const activeOfTheWeek = new Set(Object.keys(weekUserReactionCount));
        const inactiveOfTheWeek = allMemberIds.filter(id => !activeOfTheWeek.has(id) && !holidays.includes(id));

        dayLines.push('\n============================');
        dayLines.push('**Récapitulatif de la semaine**');
        dayLines.push(`- Nombre total de posts : ${totalWeekPosts}`);
        dayLines.push(`- Nombre total de réactions : ${totalWeekReactions}`);
        dayLines.push(`Nombres de membres sur le serveur : ${allMemberIds.length}`);

        // Légende des indicateurs pour le récapitulatif hebdo
        dayLines.push('\n📊 Légende des indicateurs :');
        dayLines.push('💩 : Reçoit plus de likes qu\'il n\'en donne (ratio < 0.5)');
        dayLines.push('❤️ : Donne plus de likes qu\'il n\'en reçoit (ratio > 2)');
        dayLines.push('➖ : Ratio équilibré (entre 0.5 et 2)');
        dayLines.push('👻 : Membre inactif (aucun like donné)');

        const rankingOfTheWeek = Object.entries(weekUserReactionCount).sort((a, b) => b[1] - a[1]);
        if (rankingOfTheWeek.length === 0) {
            dayLines.push('Aucun participant cette semaine.');
        } else {
            let lastScoreOfTheWeek: number | null = null;
            let lastRankOfTheWeek = 0;
            let realRankOfTheWeek = 0;
            let currentGroupOfTheWeek: string[] = [];
            rankingOfTheWeek.forEach(([id, c]) => {
                realRankOfTheWeek++;
                if (c !== lastScoreOfTheWeek) {
                    if (currentGroupOfTheWeek.length > 0) {
                        dayLines.push(`position ${lastRankOfTheWeek}`);
                        dayLines.push(...currentGroupOfTheWeek);
                        currentGroupOfTheWeek = [];
                    }
                    lastRankOfTheWeek = realRankOfTheWeek;
                    lastScoreOfTheWeek = c;
                }
                const memberLikesReceived = likesReceived[id] || 0;
                const ratio = (c + 1) / (memberLikesReceived + 1);
                const status = c === 0 ? '👻' :
                             ratio < 0.5 ? '💩' :
                             ratio > 2 ? '❤️' : '➖';
                currentGroupOfTheWeek.push(`${status} <@${id}> : ${c} likes donnés (reçus: ${memberLikesReceived}, ratio: ${ratio.toFixed(2)})`);
            });
            if (currentGroupOfTheWeek.length > 0) {
                dayLines.push(`position ${lastRankOfTheWeek}`);
                dayLines.push(...currentGroupOfTheWeek);
            }
        }

        dayLines.push(`\n👻 ${inactiveOfTheWeek.length} Membres inactifs (semaine)`);
        if (inactiveOfTheWeek.length === 0) {
            dayLines.push('Aucun membre inactif cette semaine.');
        } else {
            inactiveOfTheWeek.forEach(id => dayLines.push(`- <@${id}>`));
        }

        // Affichage des vacanciers de la semaine
        const holidaymakersOfTheWeek = allMemberIds.filter(id => holidays.includes(id));
        dayLines.push(`\n🌴 ${holidaymakersOfTheWeek.length} Membres en vacances (semaine)`);
        if (holidaymakersOfTheWeek.length === 0) {
            dayLines.push('Aucun membre en vacances cette semaine.');
        } else {
            holidaymakersOfTheWeek.forEach(id => dayLines.push(`- <@${id}>`));
        }

        dayLines.push('============================');
    }

    return dayLines;
}