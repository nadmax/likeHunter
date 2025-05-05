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

import { TextChannel, Message } from 'discord.js';
import * as dotenv from 'dotenv';
import {client} from './utils/client';
import { fetchMessagesSince } from './utils/fetchMessagesSince';
import { sendInChunks } from './utils/sendInChunks';
import { dailyReport } from './utils/dailyReport';
import { weeklyReports } from './utils/weeklyReport';
import { formatReport } from './utils/reportFormatter';
import { readFileSync, writeFileSync, existsSync } from 'fs';

dotenv.config();


// Log des événements debug, warn et error de discord.js
client.on('debug', info => console.debug('[debug]', info));
client.on('warn', warn => console.warn('[warn]', warn));
client.on('error', error => console.error('[error]', error));

client.once('ready', async () => {
  console.log(`✅ Bot connecté en tant que ${client.user?.tag}`);
  const GUILD_ID = process.env.GUILD_ID!;
  const LINKEDIN_CHANNEL_ID = process.env.LINKEDIN_CHANNEL_ID!;
  const MODERATOR_CHANNEL_ID = process.env.MODERATOR_CHANNEL_ID!;

  dailyReport (GUILD_ID, LINKEDIN_CHANNEL_ID, MODERATOR_CHANNEL_ID)

  // Commande manuelle !scan pour envoyer le rapport à la demande
  client.on('messageCreate', async message => {
    console.log('[DEBUG] Message reçu:', message.content, 'dans le salon:', message.channel.id);

    const GENERAL_CHANNEL_ID = process.env.GENERAL_CHANNEL_ID!;
    if (message.channel.id === GENERAL_CHANNEL_ID && message.content === '!vacances' && !message.author.bot) {
      let vacances = getVacancesList();
      if (vacances.includes(message.author.id)) {
        vacances = vacances.filter(id => id !== message.author.id);
        setVacancesList(vacances);
        await message.reply('Bon retour ! Tu es de nouveau compté dans les stats.');
      } else {
        vacances.push(message.author.id);
        setVacancesList(vacances);
        await message.reply('Bonnes vacances ! Tu ne seras plus compté comme inactif.');
      }
      return;
    }

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
        // Les 7 derniers jours à partir de maintenant
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        since = oneWeekAgo.getTime();
        description = "Statistiques de la semaine (7 derniers jours)";
        console.log(`[DEBUG] ${description} - messages filtrés:`);
        console.log(`[DEBUG] Période analysée (semaine) : du ${oneWeekAgo.toISOString()} (${oneWeekAgo.getTime()}) au ${now.toISOString()} (${now.getTime()})`);
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
      const postsByDate = new Map<string, { date: Date; posts: typeof postsStats }>();
      postsStats.forEach(p => {
        const date = new Date(p.msg.createdTimestamp);
        const key = date.toISOString().split('T')[0];
        if (!postsByDate.has(key)) postsByDate.set(key, { date, posts: [] });
        postsByDate.get(key)!.posts.push(p);
      });
      let dayLines: string[] = [];
      if (message.content === '!scan semaine') {
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
        dayLines = formatReport({
          guild,
          postsByDate,
          weekUserReactionCount,
          totalWeekPosts,
          totalWeekReactions,
          isWeeklyRecap: true
        });
      } else {
        dayLines = formatReport({ guild, postsByDate });
      }
      await sendInChunks(modChannel, dayLines);
    }
  });

  weeklyReports(GUILD_ID, LINKEDIN_CHANNEL_ID, MODERATOR_CHANNEL_ID )
});

client.login(process.env.DISCORD_TOKEN);

const VACANCES_FILE = './vacances.json';
function getVacancesList(): string[] {
  if (!existsSync(VACANCES_FILE)) return [];
  return JSON.parse(readFileSync(VACANCES_FILE, 'utf-8'));
}
function setVacancesList(list: string[]) {
  writeFileSync(VACANCES_FILE, JSON.stringify(list, null, 2), 'utf-8');
}
