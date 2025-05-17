import { Client, GatewayIntentBits, Partials } from 'discord.js';

export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,                     // Permet de voir les salons du serveur
        GatewayIntentBits.GuildMembers,               // nécessaire pour fetch des membres
        GatewayIntentBits.GuildMessages,               // Permet de lire les messages dans les salons
        GatewayIntentBits.MessageContent,              // Permet d'accéder au contenu des messages
    ],
    partials: [Partials.Channel],                   // Nécessaire pour recevoir certains types de messages (comme les messages supprimés)
});