import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    MessageFlags,
    ButtonInteraction,
} from 'discord.js';

export const joinCmd = new SlashCommandBuilder()
    .setName('join')
    .setDescription(`Affiche un bouton permettant aux nouveaux membres d'accéder au serveur.`);

export async function execute(interaction: ChatInputCommandInteraction) {
    const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID!;
    const TEST_CHANNEL_ID = process.env.TEST_CHANNEL_ID!;
    const MODERATOR_ROLE_ID = process.env.MODERATOR_ROLE_ID!;
    const member = await interaction.guild?.members.fetch(interaction.user.id);
    const guild = interaction.guild;
    if (!guild) {
        await interaction.reply({ content: '❌ Erreur: cette commande doit être utilisée dans un serveur.', flags: MessageFlags.Ephemeral });
        return;
    }

    if (!member || !member.roles.cache.has(MODERATOR_ROLE_ID)) {
        await interaction.reply({
            content: `⛔ Tu n’as pas la permission d'utiliser cette commande.`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (interaction.channelId !== WELCOME_CHANNEL_ID && interaction.channelId !== TEST_CHANNEL_ID) {
        await interaction.reply({ content: `⛔ Cette commande doit être utilisée dans le salon d'accueil.`, flags: MessageFlags.Ephemeral });
        return;
    }

    const button = new ButtonBuilder()
        .setCustomId('join_member_role')
        .setLabel('Rejoindre le serveur')
        .setStyle(ButtonStyle.Success);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    await interaction.reply({
        content: '👋 Clique sur le bouton ci-dessous pour accéder au serveur.',
        components: [row],
    });
}

export async function handleButtonInteraction(interaction: ButtonInteraction) {
    if (interaction.customId !== 'join_member_role') return;

    const MEMBER_ROLE_ID = process.env.MEMBER_ROLE_ID!;
    const guild = interaction.guild;

    if (!guild) {
        await interaction.reply({
            content: '❌ Cette action doit être effectuée dans un serveur.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const member = await guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) {
        await interaction.reply({
            content: '❌ Impossible de récupérer tes informations.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (member.roles.cache.has(MEMBER_ROLE_ID)) {
        await interaction.reply({
            content: '✅ Tu as déjà le rôle membre.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    await member.roles.add(MEMBER_ROLE_ID).catch(() => null);
    await interaction.reply({
        content: '🎉 Bienvenue ! Tu as maintenant accès au serveur.',
        flags: MessageFlags.Ephemeral
    });
}