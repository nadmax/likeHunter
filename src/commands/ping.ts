import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';

export const pingCmd = new SlashCommandBuilder()
    .setName('ping')
    .setDescription(`Renvoie la latence du bot et la latence de l'API`)

export async function execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) {
        await interaction.reply({ content: '❌ Erreur: cette commande doit être utilisée dans un serveur.', flags: MessageFlags.Ephemeral });
        return;
    }

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