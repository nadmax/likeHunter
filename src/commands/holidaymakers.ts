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
            content: '⛔ Tu n’as pas la permission d’utiliser cette commande.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (interaction.channelId !== TEST_CHANNEL_ID && interaction.channelId !== MODERATOR_CHANNEL_ID) {
        await interaction.reply({ content: '⛔ Cette commande ne doit pas être utilisée ici.', flags: MessageFlags.Ephemeral });
        return;
    }

    const userIds = getHolidaysList();
    if (userIds.length === 0) {
        await interaction.reply('🟢 Personne n’est actuellement en vacances.');
        return;
    }

    const mentions: string[] = [];
    for (const id of userIds) {
        const m = await guild.members.fetch(id).catch(() => null);
        if (m) {
            mentions.push(`• ${m.toString()} (${m.displayName})`);
        } else {
            mentions.push(`• \`Utilisateur inconnu\` (${id})`);
        }
    }

    const reply = `🌴 Membres en vacances :\n\n${mentions.join('\n')}`;

    await interaction.reply(reply);
}