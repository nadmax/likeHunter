# Discord Bot

Ce repository contient un bot Discord développé avec Node.js et TypeScript.

## Prérequis

- Node.js (>=16)
- npm ou yarn
- PM2 (gestionnaire de processus)
- Un fichier `.env` configuré avec vos variables d'environnement :
  ```env
  DISCORD_TOKEN=your_token_here
  GUILD_ID=your_guild_id
  LINKEDIN_CHANNEL_ID=your_channel_id
  MODERATOR_CHANNEL_ID=your_channel_id
  ```

## Installation

1. Cloner le dépôt :
   ```bash
   git clone <url-du-dépôt>
   cd discord
   ```
2. Installer les dépendances :
   ```bash
   npm install
   # ou
   yarn install
   ```
3. Créer et remplir le fichier `.env` à la racine.

## Démarrage du bot avec PM2

On utilise **PM2** pour garder le bot en ligne en permanence.

1. Démarrer le bot :
   ```bash
   pm2 start src/index.ts --name discord-bot --interpreter ts-node
   ```
   > Ici, `discord-bot` est le nom du processus.

2. Consulter les logs en temps réel :
   ```bash
   pm2 logs discord-bot
   ```

3. Redémarrer le bot :
   ```bash
   pm2 restart discord-bot
   ```

4. Autres commandes utiles :
   - Arrêter le bot : `pm2 stop discord-bot`
   - Supprimer le processus : `pm2 delete discord-bot`
   - Lister tous les processus : `pm2 list`

## Structure du projet

- `src/index.ts` : point d'entrée du bot
- `package.json`      : dépendances et scripts
- `tsconfig.json`     : configuration TypeScript

## Contribuer

Les contributions sont les bienvenues !

1. Forkez le projet
2. Créez une branche `feature/ma-fonctionnalite`
3. Commit, puis push
4. Ouvrez une Pull Request

---
*Écrit en Français pour faciliter la prise en main.*