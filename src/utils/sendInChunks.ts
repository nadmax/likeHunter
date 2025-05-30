import { TextChannel } from 'discord.js';

export async function sendInChunks(channel: TextChannel, lines: string[]) {
    let chunk = '';
    for (const line of lines) {
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