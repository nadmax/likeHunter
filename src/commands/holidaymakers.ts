import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { getHolidaysList } from '../utils/holidays';

export const listHolidaysCmd = new SlashCommandBuilder()
    .setName('vacanciers')
    .setDescription('Affiche la liste des membres actuellement en vacances.');

export async function execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    const userId = interaction.user.id;
    const TEST_CHANNEL_ID = process.env.TEST_CHANNEL_ID!;
    const MODERATOR_CHANNEL_ID = process.env.MODERATOR_CHANNEL_ID!;
    const MODERATOR_ROLE_ID = process.env.MODERATOR_ROLE_ID!;
    if (!guild) {
        await interaction.reply({
            content: '❌ Cette commande doit être utilisée dans un serveur.',
            flags: MessageFlags.Ephemeral,
        });

        return;
    }

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member || !member.roles.cache.has(MODERATOR_ROLE_ID)) {
        await interaction.reply({
            content: `⛔ Tu n’as pas la permission d'utiliser cette commande.`,
            flags: MessageFlags.Ephemeral,
        });

        return;
    }

    if (interaction.channelId !== TEST_CHANNEL_ID && interaction.channelId !== MODERATOR_CHANNEL_ID) {
        await interaction.reply({ content: '⛔ Tu ne peux pas exécuter cette commande ici.', flags: MessageFlags.Ephemeral });

        return;
    }

    await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
    });

    const userIds = getHolidaysList();
    if (userIds.length === 0) {
        await interaction.reply('🟢 Personne n’est actuellement en vacances.');

        return;
    }

    const results = await Promise.all(userIds.map(id =>
        guild.members.fetch(id)
            .then(m => `• ${m.toString()} (${m.displayName})`)
            .catch(() => `• \`Utilisateur inconnu\` (${id})`)
    ));
    const reply = `🌴 Membres en vacances :\n\n${results.join('\n')}`;

    await interaction.editReply(reply);
}
