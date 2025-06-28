import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { holidaysCmd } from './commands/holidays';
import { scanCmd } from './commands/scan';
import { pingCmd } from './commands/ping';
import { listHolidaysCmd } from './commands/holidaymakers';
import { joinCmd } from './commands/join';
import { helpCmd } from './commands/help';

dotenv.config();

const commands = [
    joinCmd,
    pingCmd,
    holidaysCmd,
    listHolidaysCmd,
    scanCmd,
    helpCmd
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
    try {
        console.log('⏳ Enregistrement des slash commands...');
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!),
            { body: commands }
        );

        console.log('✅ Slash commands enregistrées.');
    } catch (error) {
        console.error('Erreur d\'enregistrement des commandes :', error);
    }
})();
