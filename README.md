# MINIcontrol
A very simple plugin host for Trackmania United Forever, Maniaplanet and Trackmania 2020 games.

# QuickStart

1. `npm install`
2. copy .env.example to .env and configure
3. `npm start`

See [documentation](./documentation/index.md) for more info!

# Migrate from XAseco database

1. run controller once to generate database structure
2. `mysqldump -u root -p databasename > xaseco.sql`
3. move `xaseco.sql` to `tools`
5. run bun from Tools folder: `tsx xaseco.ts xaseco.sql`
6. start controller


# Notes
To build local docker image use: `docker build -t minicontrol:test -f docker/Dockerfile . `
