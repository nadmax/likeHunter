import { REST, Routes} from 'discord.js';
import dotenv from 'dotenv';
import { holidaysCmd } from './commands/holidays';
import { scanCmd }  from './commands/scan';
import { pingCmd }  from './commands/ping';

dotenv.config();

const commands = [
    pingCmd,
    holidaysCmd,
    scanCmd
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