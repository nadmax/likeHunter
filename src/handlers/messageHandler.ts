import { client } from '../utils/client';
import { handleTestCommand } from '../commands/test';

client.on('messageCreate', async message => {
    // Ignorer les messages des bots
    if (message.author.bot) return;

    // Gérer les commandes secrètes
    handleTestCommand(message);
});