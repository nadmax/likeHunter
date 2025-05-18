/**
 * LinkedIn Posts Discord Bot
 * Copyright (C) 2025 Xavier, nadmax
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

import { client } from './utils/client';
import dotenv from 'dotenv';
import './deployCommands';
import './handlers/interactionHandler';
import './handlers/messageHandler';
import { dailyReport } from './utils/dailyReport';
import { weeklyReports } from './utils/weeklyReport';

dotenv.config();

client.once('ready', async () => {
    console.log(`✅ Bot connecté en tant que ${client.user?.tag}`);
    await dailyReport(process.env.GUILD_ID!, process.env.LINKEDIN_CHANNEL_ID!, process.env.GENERAL_CHANNEL_ID!);
    await weeklyReports(process.env.GUILD_ID!, process.env.LINKEDIN_CHANNEL_ID!, process.env.MODERATOR_CHANNEL_ID!);
});

client.login(process.env.DISCORD_TOKEN);