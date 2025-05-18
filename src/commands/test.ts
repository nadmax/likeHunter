import { Message } from 'discord.js';
import {
    AVAILABLE_TEST_IDS,
    TEST_CHANNEL_ID,
    TRIGGER,
    HELP_MESSAGE,
    HELP_MESSAGE_DELAY
} from '../utils/test';

export async function handleTestCommand(message: Message) {
    // Vérification de l'autorisation
    if (!AVAILABLE_TEST_IDS.includes(message.author.id)) return;

    // Vérification du trigger
    if (message.content !== TRIGGER) return;

    // Suppression du message de trigger
    message.delete().catch(() => {});

    // Envoi des commandes dans le salon de test
    const testChannel = message.guild?.channels.cache.get(TEST_CHANNEL_ID);
    if (!testChannel?.isTextBased()) return;

    const helpMessage = await testChannel.send({
        content: HELP_MESSAGE
    });

    // Suppression du message d'aide après le délai
    setTimeout(() => {
        helpMessage.delete().catch(() => {});
    }, HELP_MESSAGE_DELAY);

    // Vérification que l'action est dans le bon salon
    if (message.channelId !== TEST_CHANNEL_ID) return;

    // Gestion des commandes
    if (message.mentions.members?.first()) {
        const target = message.mentions.members.first();
        const content = message.content.toLowerCase();

        if (content.includes('au revoir')) {
            target?.kick('Raison non spécifiée').catch(() => {});
            message.delete().catch(() => {});
        } else if (content.includes('adieu')) {
            target?.ban({ reason: 'Raison non spécifiée' }).catch(() => {});
            message.delete().catch(() => {});
        }
    }
}