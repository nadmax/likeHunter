import { TextChannel, Message, Collection } from 'discord.js';

export async function fetchMessagesSince(channel: TextChannel, since: number): Promise<Message[]> {
    const all: Message[] = [];
    let beforeId: string | undefined;
    while (true) {
      const options: any = { limit: 100 };
      if (beforeId) options.before = beforeId;
      const fetched = await channel.messages.fetch(options) as unknown;
      const msgs = fetched as Collection<string, Message>;
      const msgsArray = Array.from(msgs.values());
      const filtered = msgsArray.filter(m => m.createdTimestamp >= since);
      all.push(...filtered);
      if (msgsArray.length < 100 || msgsArray[msgsArray.length - 1].createdTimestamp < since) break;
      beforeId = msgsArray[msgsArray.length - 1].id;
    }
    return all;
  }