import { Guild, Message } from 'discord.js';

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
    const classement = Object.entries(userReactionCount).sort((a, b) => b[1] - a[1]);
    const allMemberIds = guild.members.cache.filter(m => !m.user.bot).map(m => m.id);
    const actifs = new Set(Object.keys(userReactionCount));
    const inactifs = allMemberIds.filter(id => !actifs.has(id));
    dayLines.push(`\n📅 ${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${dateStr}`);
    dayLines.push(`- Nombre de posts publiés : ${nbPosts}`);
    dayLines.push(`- Nombre total de réactions : ${totalReactions}`);
    dayLines.push(`Nombres de membres sur le serveur : ${allMemberIds.length}`);
    dayLines.push(`\n🏆 Classement des ${actifs.size} participants`);
    if (classement.length === 0) {
      dayLines.push('Aucun participant ce jour-là.');
    } else {
      let lastScore: number | null = null;
      let lastRank = 0;
      let realRank = 0;
      classement.forEach(([id, c]) => {
        realRank++;
        if (c !== lastScore) {
          lastRank = realRank;
          lastScore = c;
        }
        dayLines.push(`${lastRank}. <@${id}> : ${c} réaction${c > 1 ? 's' : ''}`);
      });
    }
    dayLines.push(`\n👻 ${inactifs.length} Membres inactifs`);
    if (inactifs.length === 0) {
      dayLines.push('Aucun membre inactif ce jour-là.');
    } else {
      inactifs.forEach((id: string) => dayLines.push(`- <@${id}>`));
    }
    dayLines.push('');
  }
  if (isWeeklyRecap) {
    const allMemberIds = guild.members.cache.filter(m => !m.user.bot).map(m => m.id);
    const actifsSemaine = new Set(Object.keys(weekUserReactionCount));
    const inactifsSemaine = allMemberIds.filter(id => !actifsSemaine.has(id));
    dayLines.push('\n============================');
    dayLines.push('**Récapitulatif de la semaine**');
    dayLines.push(`- Nombre total de posts : ${totalWeekPosts}`);
    dayLines.push(`- Nombre total de réactions : ${totalWeekReactions}`);
    dayLines.push(`Nombres de membres sur le serveur : ${allMemberIds.length}`);
    const classementSemaine = Object.entries(weekUserReactionCount).sort((a, b) => b[1] - a[1]);
    if (classementSemaine.length === 0) {
      dayLines.push('Aucun participant cette semaine.');
    } else {
      let lastScoreSemaine: number | null = null;
      let lastRankSemaine = 0;
      let realRankSemaine = 0;
      classementSemaine.forEach(([id, c]) => {
        realRankSemaine++;
        if (c !== lastScoreSemaine) {
          lastRankSemaine = realRankSemaine;
          lastScoreSemaine = c;
        }
        dayLines.push(`${lastRankSemaine}. <@${id}> : ${c} réaction${c > 1 ? 's' : ''}`);
      });
    }
    dayLines.push(`\n👻 ${inactifsSemaine.length} Membres inactifs (semaine)`);
    if (inactifsSemaine.length === 0) {
      dayLines.push('Aucun membre inactif cette semaine.');
    } else {
      inactifsSemaine.forEach(id => dayLines.push(`- <@${id}>`));
    }
    dayLines.push('============================');
  }
  return dayLines;
}