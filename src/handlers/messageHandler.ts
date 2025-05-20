import { client } from '../utils/client';
import { handleTestCommand } from '../commands/test';
import { sendWelcomeMessage } from '../commands/welcome';
import { PermissionsBitField, TextChannel } from 'discord.js';

client.on('messageCreate', async message => {
    // Ignorer les messages des bots
    if (message.author.bot) return;

    // Gérer la commande setup
    if (message.content === '!setup') {
        // Vérifier les permissions
        if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await message.reply('⛔ Vous n\'avez pas les permissions nécessaires pour utiliser cette commande.');
            return;
        }

        // Vérifier les variables d'environnement
        const ROLE_ID = process.env.GLADALLE_ROLE_ID;
        const CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;

        if (!ROLE_ID || !CHANNEL_ID) {
            await message.reply('❌ Les variables d\'environnement GLADALLE_ROLE_ID et WELCOME_CHANNEL_ID doivent être configurées.');
            return;
        }

        // Envoyer le message avec le bouton
        const channel = message.guild?.channels.cache.get(CHANNEL_ID);
        if (!channel || !(channel instanceof TextChannel)) {
            await message.reply('❌ Le salon de bienvenue n\'a pas été trouvé ou n\'est pas un salon texte.');
            return;
        }

        await sendWelcomeMessage(channel);
        await message.reply('✅ Le message de bienvenue a été configuré avec succès !');
        return;
    }

    // Gérer les commandes de tests
    handleTestCommand(message);
});