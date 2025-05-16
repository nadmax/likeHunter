import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getHolidaysList, setHolidaysList } from '../utils/holidays';

export const holidaysCmd = new SlashCommandBuilder()
    .setName('vacances')
    .setDescription('Active/désactive ton statut de vacances.');

export async function execute(interaction: ChatInputCommandInteraction) {
    const GENERAL_CHANNEL_ID = process.env.GENERAL_CHANNEL_ID!;
    if (interaction.channelId !== GENERAL_CHANNEL_ID) {
        await interaction.reply({ content: '⛔ Cette commande doit être utilisée dans le salon général.', ephemeral: true });
        return;
    }

    const userId = interaction.user.id;
    let holidays = getHolidaysList();
    const isOnHolidays = holidays.includes(userId);

    if (isOnHolidays) {
        holidays = holidays.filter(id => id !== userId);
        setHolidaysList(holidays);
        await interaction.reply('Bon retour ! Tu es de nouveau compté dans les stats.');
    } else {
        holidays.push(userId);
        setHolidaysList(holidays);
        await interaction.reply('Bonnes vacances ! Tu ne seras plus compté comme inactif.');
    }
}