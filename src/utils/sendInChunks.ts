import { TextChannel } from 'discord.js';

// Fonction utilitaire pour envoyer un tableau de lignes en plusieurs messages si nécessaire
export async function sendInChunks(channel: TextChannel, lines: string[]) {
    let chunk = '';
    for (const line of lines) {
        // Si on dépasse environ 2000 caractères, on envoie le chunk courant
        if ((chunk + line + '\n').length > 1900) {
            await channel.send({ content: chunk });
            chunk = '';
        }
        chunk += line + '\n';
    }

    if (chunk.length > 0) {
        await channel.send({ content: chunk });
    }
}