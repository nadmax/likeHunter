import { TextChannel, Message, Collection } from 'discord.js';

export async function fetchMessagesSince(channel: TextChannel, since: number): Promise<Message[]> {
    const fetchedMessages: Message[] = [];
    let beforeId: string | undefined;
    while (true) {
        const options: any = { limit: 100 };
        if (beforeId) {
            options.before = beforeId
        }

        const collection = await channel.messages.fetch(options) as unknown as Collection<string, Message>;
        const collectionArray = Array.from(collection.values());
        const filtered = collectionArray.filter(m => m.createdTimestamp >= since);
        fetchedMessages.push(...filtered);
        if (collectionArray.length < 100 || collectionArray[collectionArray.length - 1].createdTimestamp < since) {
            break;
        }

        beforeId = collectionArray[collectionArray.length - 1].id;
    }

    return fetchedMessages;
}