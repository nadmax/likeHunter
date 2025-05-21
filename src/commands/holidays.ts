import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getHolidaysList, setHolidaysList } from '../utils/holidays';

export const holidaysCmd = new SlashCommandBuilder()
    .setName('vacances')
    .setDescription('Active/désactive ton statut de vacances.');

export async function execute(interaction: ChatInputCommandInteraction) {
    const GENERAL_CHANNEL_ID = process.env.GENERAL_CHANNEL_ID!;
    const TEST_CHANNEL_ID = process.env.TEST_CHANNEL_ID!;

    // console.log('[DEBUG] Vérification du salon:');
    // console.log('[DEBUG] Salon actuel:', interaction.channelId);
    // console.log('[DEBUG] Salon attendu (GENERAL_CHANNEL_ID):', GENERAL_CHANNEL_ID);
    // console.log('[DEBUG] Les deux sont-ils égaux?', interaction.channelId === GENERAL_CHANNEL_ID);


    if (interaction.channelId !== GENERAL_CHANNEL_ID && interaction.channelId !== TEST_CHANNEL_ID) {
        await interaction.reply({ content: '⛔ Cette commande doit être utilisée dans le salon général.', ephemeral: true });
        return;
    }

    const userId = interaction.user.id;
    let holidays = getHolidaysList();
    const isOnHolidays = holidays.includes(userId);

    if (isOnHolidays) {
        holidays = holidays.filter(id => id !== userId);
        setHolidaysList(holidays);
        await interaction.reply('🎉 Bienvenue de retour ! La dalle t\'attend, on va pouvoir compter sur toi !');
    } else {
        holidays.push(userId);
        setHolidaysList(holidays);
        await interaction.reply('🌴 Profite bien de tes vacances ! On te laisse tranquille, mais reviens-nous vite !');
    }
}