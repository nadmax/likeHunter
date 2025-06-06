import { client } from '../utils/client';
import * as holidaysCmd from '../commands/holidays';
import * as scanCmd from '../commands/scan';
import * as joinCmd from '../commands/join';
import * as pingCmd from '../commands/ping';
import * as listHolidaysCmd from '../commands/holidaymakers';
import { ChatInputCommandInteraction } from 'discord.js';

client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        await joinCmd.handleButtonInteraction(interaction);
        return;
    }

    if (!interaction.isChatInputCommand()) {
        return;
    }

    const handlers: Record<string, (interaction: ChatInputCommandInteraction) => void> = {
        join: joinCmd.execute,
        ping: pingCmd.execute,
        scan: scanCmd.execute,
        vacances: holidaysCmd.execute,
        vacanciers: listHolidaysCmd.execute
    };
    const handler = handlers[interaction.commandName];
    if (handler) {
        await handler(interaction);
    }
});