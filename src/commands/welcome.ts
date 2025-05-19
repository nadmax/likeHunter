import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, SlashCommandBuilder, PermissionsBitField, TextChannel, ButtonInteraction, GuildMember, Events } from 'discord.js';

export const welcomeCmd = new SlashCommandBuilder()
    .setName('bienvenue')
    .setDescription('Configure le message de bienvenue avec le bouton d\'attribution de rôle.');

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        // Vérification des permissions
        const member = interaction.member as GuildMember;
        if (!member || !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: '⛔ Vous n\'avez pas les permissions nécessaires pour utiliser cette commande.', ephemeral: true });
            return;
        }

        const ROLE_ID = process.env.GLADALLE_ROLE_ID;
        const CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;

        if (!ROLE_ID || !CHANNEL_ID) {
            await interaction.reply({ content: '❌ Les variables d\'environnement GLADALLE_ROLE_ID et WELCOME_CHANNEL_ID doivent être configurées.', ephemeral: true });
            return;
        }

        const channel = await interaction.guild?.channels.fetch(CHANNEL_ID);
        if (!channel || !(channel instanceof TextChannel)) {
            await interaction.reply({ content: '❌ Le salon de bienvenue n\'a pas été trouvé ou n\'est pas un salon texte.', ephemeral: true });
            return;
        }

        await sendWelcomeMessage(channel);

        await interaction.reply({ content: '✅ Le message de bienvenue a été configuré avec succès !', ephemeral: true });
    } catch (error) {
        console.error('Erreur lors de la configuration du message de bienvenue:', error);
        await interaction.reply({ content: '❌ Une erreur est survenue lors de la configuration du message de bienvenue.', ephemeral: true });
    }
}

export async function sendWelcomeMessage(channel: TextChannel) {
    try {
        const bouton = new ButtonBuilder()
            .setCustomId('get_role')
            .setLabel('J\'ai la dalle et je vais participer ou me faire ban sinon')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(bouton);

        await channel.send({
            content: 'Pour accéder au serveur, clique sur le bouton ci-dessous et confirme que tu as la dalle et que tu vas participer.',
            components: [row],
        });
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message de bienvenue:', error);
    }
}

export async function handleButtonInteraction(interaction: ButtonInteraction) {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'get_role') return;

    try {
        const ROLE_ID = process.env.GLADALLE_ROLE_ID;
        if (!ROLE_ID) {
            await interaction.reply({ content: '❌ Configuration manquante pour le rôle G_La_Dalle.', ephemeral: true });
            return;
        }

        const role = interaction.guild?.roles.cache.get(ROLE_ID);
        if (!role) {
            await interaction.reply({ content: '❌ Le rôle G_La_Dalle n\'existe pas.', ephemeral: true });
            return;
        }

        const member = interaction.member as GuildMember;
        if (!member) {
            await interaction.reply({ content: '❌ Impossible de trouver votre profil sur le serveur.', ephemeral: true });
            return;
        }

        // Vérifier si l'utilisateur a déjà le rôle
        if (member.roles.cache.has(ROLE_ID)) {
            await interaction.reply({ content: 'ℹ️ Vous avez déjà le rôle G_La_Dalle !', ephemeral: true });
            return;
        }

        await member.roles.add(role);
        await interaction.reply({ content: '✅ Rôle G_La_Dalle attribué ! Bienvenue sur le serveur !', ephemeral: true });
    } catch (error) {
        console.error('Erreur lors de l\'attribution du rôle:', error);
        await interaction.reply({ content: '❌ Une erreur est survenue lors de l\'attribution du rôle.', ephemeral: true });
    }
}

export async function handleNewMember(member: GuildMember) {
    try {
        const CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;
        if (!CHANNEL_ID) {
            console.error('❌ Configuration manquante pour le salon de bienvenue (WELCOME_CHANNEL_ID)');
            return;
        }

        const channel = member.guild.channels.cache.get(CHANNEL_ID);
        if (!channel || !(channel instanceof TextChannel)) {
            console.error('❌ Le salon de bienvenue n\'a pas été trouvé ou n\'est pas un salon texte');
            return;
        }

        const bouton = new ButtonBuilder()
            .setCustomId(`confirm_${member.id}`)
            .setLabel('J\'ai la dalle et je vais participer ou me faire ban sinon')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(bouton);

        await channel.send({
            content: `Bienvenue ${member} ! Pour accéder au serveur, tu dois confirmer que tu as la dalle et que tu vas participer.`,
            components: [row],
        });
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message de bienvenue:', error);
    }
}