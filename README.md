# LikeHunter
A Discord bot that tracks and analyzes LinkedIn posts shared in a dedicated channel, monitors reactions, and generates activity reports.

## 📋 Features
- Tracks LinkedIn post links shared in a dedicated channel
- Monitors reactions (✅) on posts
- Generates daily and weekly reports automatically
- Provides manual report generation commands
- Identifies members who haven't reacted to posts

## ⚙️ Prerequisites
- Docker
- Discord bot token (from [Discord Developer Portal](https://discord.com/developers/applications))

## 🚀 Getting Started
A ``compose.yaml`` file is included for an easy setup.
Run the bot with the following command:
```bash
docker compose up -d
```
⚠️ You need to create the ``.env`` file before running the above command!
Otherwise you will get an error.

## 🛠️ Discord Bot Configuration
Before running the bot, make sure you have properly configured your application in the [Discord Developer Portal](https://discord.com/developers/applications):

1. Go to the **Bot** tab of your application.
2. Enable the following options in the **Privileged Gateway Intents** section:
   - **PRESENCE INTENT**
   - **SERVER MEMBERS INTENT**
   - **MESSAGE CONTENT INTENT**
3. Copy your bot **Token** and paste it into your `.env` file.

⚠️ These options are required for the bot to read messages, track presences, and access the server member list.

## 🤝 Contributing
All contributions are welcome and appreciated.  
Please make sur to read the [contribution guide](https://github.com/nadmax/likeHunter/blob/master/CONTRIBUTING.md) for guidelines before submitting a pull request.