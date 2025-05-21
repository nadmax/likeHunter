import { SlashCommandBuilder, ChatInputCommandInteraction, OverwriteType, PermissionFlagsBits } from 'discord.js';
import { getHolidaysList, setHolidaysList } from '../utils/holidays';

export const holidaysCmd = new SlashCommandBuilder()
    .setName('vacances')
    .setDescription('Active/désactive ton statut de vacances.');

export async function execute(interaction: ChatInputCommandInteraction) {
    const GENERAL_CHANNEL_ID = process.env.GENERAL_CHANNEL_ID!;
    const TEST_CHANNEL_ID = process.env.TEST_CHANNEL_ID!;
    const LINKEDIN_CHANNEL_ID = process.env.LINKEDIN_CHANNEL_ID!;
    const MEMBER_ROLE_ID = process.env.GLADALLE_ROLE_ID!;
    const HOLIDAYS_ROLE_ID = process.env.HOLIDAYS_ROLE_ID!;
    if (interaction.channelId !== GENERAL_CHANNEL_ID && interaction.channelId !== TEST_CHANNEL_ID) {
        await interaction.reply({ content: '⛔ Cette commande doit être utilisée dans le salon général.', ephemeral: true });
        return;
    }

    const userId = interaction.user.id;
    const guild = interaction.guild;
    if (!guild) {
        await interaction.reply({ content: '❌ Erreur: cette commande doit être utilisée dans un serveur.', ephemeral: true });
        return;
    }

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
        await interaction.reply({ content: '❌ Impossible de récupérer les informations de ton profil.', ephemeral: true });
        return;
    }

    const memberRole = guild.roles.cache.find(role => role.id === MEMBER_ROLE_ID);
    const vacationRole = guild.roles.cache.find(role => role.id === HOLIDAYS_ROLE_ID);
    if (!memberRole || !vacationRole) {
        await interaction.reply({ content: '❌ Les rôles G_La_Dalle et vacances sont introuvables.', ephemeral: true });
        return;
    }

    await vacationRole.setPosition(memberRole.position + 1).catch(err => {
        console.error('Error adjusting role positions:', err);
    });

    const linkedInChannel = guild.channels.cache.get(LINKEDIN_CHANNEL_ID);
    if (!linkedInChannel || !linkedInChannel.isTextBased()) {
        await interaction.reply({ content: '❌ Le salon LinkedIn est introuvable ou invalide.', ephemeral: true });
        return;
    }

    let holidays = getHolidaysList();
    const isOnHolidays = holidays.includes(userId);
    if (isOnHolidays) {
        holidays = holidays.filter(id => id !== userId);
        setHolidaysList(holidays);
        await member.roles.remove(vacationRole).catch(() => null);
        await linkedInChannel.edit({
            permissionOverwrites: [
                {
                    id: member.id,
                    type: OverwriteType.Member,
                    allow: [],
                    deny: [],
                }
            ]
        }).catch(() => null);
        await interaction.reply('🎉 Bienvenue de retour ! La dalle t\'attend, on va pouvoir compter sur toi !');
    } else {
        holidays.push(userId);
        setHolidaysList(holidays);
        await member.roles.add(vacationRole).catch(() => null);
                await linkedInChannel.edit({
            permissionOverwrites: [
                {
                    id: member.id,
                    type: OverwriteType.Member,
                    allow: [],
                    deny: [PermissionFlagsBits.ViewChannel],
                }
            ]
        }).catch(() => null);
        await interaction.reply('🌴 Profite bien de tes vacances ! On te laisse tranquille, mais reviens-nous vite !');
    }
}