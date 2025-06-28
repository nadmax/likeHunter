import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const helpCmd = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Liste les commandes disponibles.');

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
        embeds: [{
            color: 0x0099ff,
            title: 'Commandes disponibles',
            description: 'Voici la liste des commandes disponibles :',
            fields: [
                {
                    name: '/vacances',
                    value: 'Active ou désactive ton statut de vacances.'
                },
                {
                    name: '/ping',
                    value: 'Renvoie la latence du bot et de l\'API.'
                },
                {
                    name: '/help',
                    value: 'Affiche cette liste d\'aide.'
                }
            ],
            footer: {
                text: 'Utilise une commande avec / pour l’exécuter.'
            }
        }]
    });
};
