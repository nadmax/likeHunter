# LinkedIn Posts Discord Bot

A Discord bot that tracks and analyzes LinkedIn posts shared in a dedicated channel, monitors reactions, and generates activity reports.

## 📋 Features

- Tracks LinkedIn post links shared in a dedicated channel
- Monitors reactions (✅ and 💬) on posts
- Generates daily and weekly reports automatically
- Provides manual report generation commands
- Identifies members who haven't reacted to posts

## 🚀 Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example`
4. Build the TypeScript code: `npm run build`
5. Start the bot: `npm start`

For production, consider using PM2:
```bash
pm2 start dist/index.js --name discord-bot
```

## ⚙️ Prerequisites

- Node.js (>=16)
- npm or yarn
- PM2 (process manager)
- Discord bot token (from [Discord Developer Portal](https://discord.com/developers/applications))

## 🔑 Environment Variables

Create a `.env` file with the following variables:

# Discord Bot Token (from Discord Developer Portal)
DISCORD_TOKEN=your_discord_bot_token

# Discord Server (Guild) ID
GUILD_ID=123456789012345678

# Channel IDs
LINKEDIN_CHANNEL_ID=123456789012345678  # Channel for sharing LinkedIn posts
MODERATOR_CHANNEL_ID=123456789012345678 # Channel for receiving reports

## 💻 Commands

The bot responds to the following commands in the moderator channel:

| Command | Description | Required Role |
|---------|-------------|--------------|
| `!scan jour` | Generate a report for posts from the current day | Le_Dalleu |
| `!scan semaine` | Generate a report for posts from the current week (since last Friday 18:00 UTC) | Le_Dalleu |

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