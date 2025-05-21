# LinkedIn Posts Discord Bot

A Discord bot that tracks and analyzes LinkedIn posts shared in a dedicated channel, monitors reactions, and generates activity reports.

## 📋 Features

- Tracks LinkedIn post links shared in a dedicated channel
- Monitors reactions (✅) on posts
- Generates daily and weekly reports automatically
- Provides manual report generation commands
- Identifies members who haven't reacted to posts

## 🚀 Installation
If you want to locally run the bot, follow these steps:
1. Clone this repository
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example`
4. Build the TypeScript code: `npm run build`
5. Start the bot: `npm start`

## 🚀 Production with PM2

To run the bot in production with pm2:

```bash
npm run build
pm2 start dist/index.js --name discord-bot
```

> **Note:** Always use the compiled code (`dist/index.js`) in production for better performance and stability.

## 🐳 Docker
A ``compose.yaml`` file is included for an easy setup.
Run the bot with the following command:
```bash
docker compose up -d
```

⚠️ You need to create the ``.env`` file before running the above command!
Otherwise you will get an error.

## ⚙️ Prerequisites

- Node.js (>=16)
- npm or yarn
- PM2 (process manager)
- Docker
- Discord bot token (from [Discord Developer Portal](https://discord.com/developers/applications))

## 🛠️ Discord Bot Configuration

Before running the bot, make sure you have properly configured your application in the [Discord Developer Portal](https://discord.com/developers/applications):

1. Go to the **Bot** tab of your application.
2. Enable the following options in the **Privileged Gateway Intents** section:
   - **PRESENCE INTENT**
   - **SERVER MEMBERS INTENT**
   - **MESSAGE CONTENT INTENT**
3. Copy your bot **Token** and paste it into your `.env` file.

> These options are required for the bot to read messages, track presences, and access the server member list.

## 💻 Commands

The bot responds to the following commands in the moderator channel:

| Command | Description | Required Role |
|---------|-------------|--------------|
| `!scan jour` | Generate a report for posts from the current day | Le_Dalleu |
| `!scan semaine` | Generate a report for posts from the current week (since last Friday 18:00 UTC) | Le_Dalleu |
| `!vacances` | Toggle your vacation status (excluded from inactive stats and shown in reports) | Everyone |

## ⏱️ Automatic Reports

The bot automatically generates reports:

- **Daily Report**: Every day at midnight UTC, a report of the previous day's posts is sent to the moderator channel
- **Weekly Report**: Every Friday at 18:00 UTC, a weekly summary report is sent to the moderator channel

## 📊 Report Content

Reports include:
- Posts grouped by day
- Reaction counts per post
- Reaction distribution among users
- List of members who haven't reacted to any posts

## 📁 Project Structure

- `src/index.ts`: bot entry point
- `package.json`: dependencies and scripts
- `tsconfig.json`: TypeScript configuration

## 🤝 Contributing

Contributions are welcome!

1. Fork the project
2. Create a branch `feature/your-feature`
3. Commit, then push
4. Open a Pull Request

## 📄 License

This project is licensed under the [GNU AGPL v3](LICENSE) - see the LICENSE file for details.

This license ensures that:
- Anyone can use, modify, and distribute this code
- All derivative works must also be distributed under the AGPL-3.0
- Source code must be made available when the software is distributed
- If you modify the code and run it as a network service (like a Discord bot), you must make your modified source code available to users
