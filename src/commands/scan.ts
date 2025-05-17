import { SlashCommandBuilder, ChatInputCommandInteraction, TextChannel } from 'discord.js';
import { fetchMessagesSince } from '../utils/fetchMessagesSince';
import { sendInChunks } from '../utils/sendInChunks';
import { formatReport } from '../utils/reportFormatter';

export const scanCmd = new SlashCommandBuilder()
    .setName('scan')
    .setDescription('Scan les messages LinkedIn')
    .addStringOption(option =>
        option.setName('période')
        .setDescription('Période à analyser')
        .setRequired(true)
        .addChoices({ name: 'jour', value: 'jour' }, { name: 'semaine', value: 'semaine' })
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const period = interaction.options.getString('période');
    const MODERATOR_CHANNEL_ID = process.env.MODERATOR_CHANNEL_ID!;
    const LINKEDIN_CHANNEL_ID = process.env.LINKEDIN_CHANNEL_ID!;

    if (interaction.channelId !== MODERATOR_CHANNEL_ID) {
        await interaction.reply({ content: '⛔ Cette commande est réservée au salon modérateur.', ephemeral: true });
        return;
    }

    const member = await interaction.guild?.members.fetch(interaction.user.id);
    if (!member?.roles.cache.some(role => role.name.toLowerCase() === 'le_dalleu')) {
        await interaction.reply({ content: '⛔ Seuls les administrateurs peuvent utiliser cette commande.', ephemeral: true });
        return;
    }

    await interaction.reply('📊 Récupération des messages...');

    const now = new Date();
    const since = period === 'jour'
        ? now.getTime() - 24 * 60 * 60 * 1000
        : now.getTime() - 7 * 24 * 60 * 60 * 1000;

    const postChannel = await interaction.client.channels.fetch(LINKEDIN_CHANNEL_ID!) as TextChannel;
    const modChannel = await interaction.client.channels.fetch(MODERATOR_CHANNEL_ID!) as TextChannel;

    const allMessages = await fetchMessagesSince(postChannel, since);
    const filteredMessages = allMessages.filter(m => /https?:\/\//.test(m.content));
    if (filteredMessages.length === 0) {
        await interaction.followUp('Aucun post avec lien trouvé pour cette période.');
        return;
    }

    const postsStats = [];
    const countsPerUser: Record<string, number> = {};

    for (const msg of filteredMessages) {
        const checkReaction = msg.reactions.cache.get('✅');
        let userIds: string[] = [];

        if (checkReaction) {
            const users = await checkReaction.users.fetch();
            userIds.push(...users.filter(u => !u.bot).map(u => u.id));
        }

        userIds = [...new Set(userIds)];
        postsStats.push({ msg, userIds });
        userIds.forEach(id => (countsPerUser[id] = (countsPerUser[id] || 0) + 1));
    }

    const postsByDate = new Map<string, { date: Date, posts: typeof postsStats }>();
    for (const p of postsStats) {
        const date = new Date(p.msg.createdTimestamp);
        const key = date.toISOString().split('T')[0];
        if (!postsByDate.has(key)) postsByDate.set(key, { date, posts: [] });
        postsByDate.get(key)!.posts.push(p);
    }

    let reportLines: string[] = [];
    if (period === 'semaine') {
        let totalWeekPosts = 0, totalWeekReactions = 0;
        const weekUserReactionCount: Record<string, number> = {};

        for (const { posts } of postsByDate.values()) {
        posts.forEach(p => {
            totalWeekPosts++;
            totalWeekReactions += p.userIds.length;
            p.userIds.forEach(id => weekUserReactionCount[id] = (weekUserReactionCount[id] || 0) + 1);
        });
        }

        reportLines = formatReport({
            guild: interaction.guild!,
            postsByDate,
            weekUserReactionCount,
            totalWeekPosts,
            totalWeekReactions,
            isWeeklyRecap: true
        });
    } else {
        reportLines = formatReport({ guild: interaction.guild!, postsByDate });
    }

    await sendInChunks(modChannel, reportLines);
    await interaction.followUp('✅ Rapport envoyé.');
}