import { client } from './utils/client';
import dotenv from 'dotenv';
import './deployCommands';
import './handlers/interactionHandler';
import { dailyReport } from './utils/dailyReport';
import { weeklyReports } from './utils/weeklyReport';

dotenv.config();

client.once('ready', async () => {
    console.log(`✅ Bot connecté en tant que ${client.user?.tag}`);
    await dailyReport(process.env.GUILD_ID!, process.env.LINKEDIN_CHANNEL_ID!, process.env.GENERAL_CHANNEL_ID!);
    await weeklyReports(process.env.GUILD_ID!, process.env.LINKEDIN_CHANNEL_ID!, process.env.MODERATOR_CHANNEL_ID!);
});

client.login(process.env.DISCORD_TOKEN);