import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionsBitField, TextChannel, GuildMember } from 'discord.js';
import { sendWelcomeMessage } from './welcome';

export const setupCmd = new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Envoie le message avec le bouton de bienvenue (à utiliser une seule fois)');

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const member = interaction.member as GuildMember;
        if (!member || !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: '⛔ Vous n\'avez pas les permissions nécessaires pour utiliser cette commande.', ephemeral: true });
            return;
        }

        const channel = interaction.channel;
        if (!channel || !(channel instanceof TextChannel)) {
            await interaction.reply({ content: '❌ Cette commande doit être utilisée dans un salon texte.', ephemeral: true });
            return;
        }

        await sendWelcomeMessage(channel);
        await interaction.reply({ content: '✅ Le message avec le bouton a été envoyé ! Vous pouvez maintenant supprimer cette commande.', ephemeral: true });
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        await interaction.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
    }
}