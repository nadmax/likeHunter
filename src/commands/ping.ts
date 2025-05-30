import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const pingCmd = new SlashCommandBuilder()
    .setName('ping')
    .setDescription(`Réponse concernant la latence des robots et la latence de l'API`)

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
        content: 'Pinging...',
        withResponse: true,
    });

    const roundTrip = Date.now() - interaction.createdTimestamp;
    const apiLatency = interaction.client.ws.ping;

    await interaction.editReply(
        `🏓 Pong!\nLatence aller-retour: **${roundTrip}ms**\nLatence WebSocket: **${apiLatency}ms**`
    );
}