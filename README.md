# MINIcontrol
A very simple plugin host for Trackmania United Forever, Maniaplanet and Trackmania 2020 games.

# QuickStart

1. `npm i -g bun`
2. `bun install`
3. copy .env.example to .env and configure
4. `bun start`

See [documentation](./documentation/index.md) for more info!

# Migrate from XAseco database

1. run controller once to generate database structure
2. `mysqldump -u root -p databasename > xaseco.sql`
3. move `xaseco.sql` to `tools`
5. run bun from Tools folder: `bun xaseco.ts xaseco.sql`
6. start controller
