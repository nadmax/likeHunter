import { AttachmentBuilder, SlashCommandBuilder, ChatInputCommandInteraction, TextChannel, MessageFlags } from 'discord.js';
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
    const TEST_CHANNEL_ID = process.env.TEST_CHANNEL_ID!;
    const LINKEDIN_CHANNEL_ID = process.env.LINKEDIN_CHANNEL_ID!;
    const MODERATOR_ROLE_ID = process.env.MODERATOR_ROLE_ID!;
    const guild = interaction.guild;
    if (!guild) {
        await interaction.reply({ content: '❌ Erreur: cette commande doit être utilisée dans un serveur.', flags: MessageFlags.Ephemeral });
        return;
    }

    if (interaction.channelId !== MODERATOR_CHANNEL_ID && interaction.channelId !== TEST_CHANNEL_ID) {
        await interaction.reply({ content: '⛔ Tu ne peux pas exécuter cette commande ici.', flags: MessageFlags.Ephemeral });
        return;
    }

    const member = await guild.members.fetch(interaction.user.id);
    const hasModeratorRole = member?.roles.cache.some(role => role.id === MODERATOR_ROLE_ID);
    if (!hasModeratorRole) {
        await interaction.reply({ content: '⛔ Seuls les administrateurs peuvent utiliser cette commande.', flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.reply('📊 Récupération des réactions...');

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
        const fullMsg = await msg.fetch();
        const checkReaction = fullMsg.reactions.cache.get('✅');
        let userIds: string[] = [];

        if (checkReaction) {
            const users = await checkReaction.users.fetch();
            userIds.push(...users.filter(u => !u.bot).map(u => u.id));
        }

        userIds = [...new Set(userIds)];
        postsStats.push({ msg: fullMsg, userIds });
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
            guild: guild,
            postsByDate,
            weekUserReactionCount,
            totalWeekPosts,
            totalWeekReactions,
            isWeeklyRecap: true
        });
        const fullReport = reportLines.join('\n');
        const buffer = Buffer.from(fullReport, 'utf-8');
        const file = new AttachmentBuilder(buffer, { name: 'weekly_report.txt' });

        await modChannel.send({ content: '📄 Rapport hebdomadaire :', files: [file] });
    } else {
        reportLines = formatReport({ guild: guild, postsByDate });

        await sendInChunks(modChannel, reportLines);
    }
    await interaction.followUp('✅ Rapport envoyé.');
}
