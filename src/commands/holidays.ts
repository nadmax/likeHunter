import { SlashCommandBuilder, ChatInputCommandInteraction, OverwriteType, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getHolidaysList, setHolidaysList } from '../utils/holidays';

export const holidaysCmd = new SlashCommandBuilder()
    .setName('vacances')
    .setDescription('Active/désactive ton statut de vacances.');

export async function execute(interaction: ChatInputCommandInteraction) {
    const GENERAL_CHANNEL_ID = process.env.GENERAL_CHANNEL_ID!;
    const TEST_CHANNEL_ID = process.env.TEST_CHANNEL_ID!;
    const LINKEDIN_CHANNEL_ID = process.env.LINKEDIN_CHANNEL_ID!;
    const MEMBER_ROLE_ID = process.env.MEMBER_ROLE_ID!;
    const MODERATOR_ROLE_ID = process.env.MODERATOR_ROLE_ID!;
    const HOLIDAYS_ROLE_ID = process.env.HOLIDAYS_ROLE_ID!;

    if (interaction.channelId !== GENERAL_CHANNEL_ID && interaction.channelId !== TEST_CHANNEL_ID) {
        await interaction.reply({ content: '⛔ Cette commande doit être utilisée dans le salon général.', flags: MessageFlags.Ephemeral });
        return;
    }

    const userId = interaction.user.id;
    const guild = interaction.guild;
    if (!guild) {
        await interaction.reply({ content: '❌ Erreur: cette commande doit être utilisée dans un serveur.', flags: MessageFlags.Ephemeral });
        return;
    }

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
        await interaction.reply({ content: '❌ Impossible de récupérer les informations de ton profil.', flags: MessageFlags.Ephemeral });
        return;
    }


    const isModerator = member.roles.cache.has(MODERATOR_ROLE_ID);
    const memberRole = guild.roles.cache.find(role => role.id === MEMBER_ROLE_ID);
    const moderatorRole = guild.roles.cache.find(role => role.id === MODERATOR_ROLE_ID);
    const vacationRole = guild.roles.cache.find(role => role.id === HOLIDAYS_ROLE_ID);
    if (!vacationRole) {
        await interaction.reply({ content: '❌ Le rôle "vacances" est introuvable.', flags: MessageFlags.Ephemeral });
        return;
    }

    const referenceRole = isModerator ? moderatorRole : memberRole;
    if (!referenceRole) {
        console.warn(`⚠️ Le rôle de référence (${isModerator ? 'modérateur' : 'membre'}) est introuvable. Le positionnement du rôle vacances est ignoré.`);
    } else if (vacationRole.position <= referenceRole.position) {
        await vacationRole.setPosition(referenceRole.position + 1).catch(err => {
            console.error('❌ Erreur lors du repositionnement du rôle vacances :', err);
        });
    }

    const linkedInChannel = guild.channels.cache.get(LINKEDIN_CHANNEL_ID);
    if (!linkedInChannel || !linkedInChannel.isTextBased()) {
        await interaction.reply({ content: '❌ Le salon LinkedIn est introuvable ou invalide.', flags: MessageFlags.Ephemeral });
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
            ],
        }).catch(() => null);
        await interaction.reply('🎉 Bon retour parmi nous ! La dalle t\'attend, on va pouvoir compter sur toi !');
    } else {
        holidays.push(userId);
        setHolidaysList(holidays);
        await member.roles.add(vacationRole).catch(() => null);
                await linkedInChannel.edit(isModerator
                    ?
                    {
                        permissionOverwrites: [
                            {
                                id: member.id,
                                type: OverwriteType.Member,
                                allow: [],
                                deny: [
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.AddReactions
                                ]
                            }
                        ]
                    }
                    :
                    {
                        permissionOverwrites: [
                            {
                                id: member.id,
                                type: OverwriteType.Member,
                                allow: [],
                                deny: [PermissionFlagsBits.ViewChannel],
                            }
                        ]
                    }).catch(() => null);
        await interaction.reply('🌴 Profite bien de tes vacances, on te laisse tranquille. Mais reviens vite !');
    }
}