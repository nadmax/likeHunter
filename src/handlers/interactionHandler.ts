import { client } from '../utils/client';
import * as holidaysCmd from '../commands/holidays';
import * as scanCmd from '../commands/scan';
import * as welcomeCmd from '../commands/welcome';

client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        await welcomeCmd.handleButtonInteraction(interaction);
        return;
    }

    if (!interaction.isChatInputCommand()) {
        return;
    }

    const handlers: Record<string, (interaction: any) => void> = {
        vacances: holidaysCmd.execute,
        scan: scanCmd.execute
    };
    const handler = handlers[interaction.commandName];
    if (handler) {
        await handler(interaction);
    }
});