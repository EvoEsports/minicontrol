<div align="center">
    <img src="./images/minicontrol.png" width="60%" />
    <br>
    <img alt="GitHub" src="https://img.shields.io/github/license/EvoEsports/minicontrol?label=License" />
    <img alt="GitHub Tag" src="https://img.shields.io/github/v/tag/evoesports/minicontrol?label=Current%20Version" />
    <img alt="NodeJS" src="https://img.shields.io/badge/node.js-6DA55F?logo=node.js&logoColor=white" />
    <a href="https://discord.gg/evoesports"><img alt="Discord" src="https://img.shields.io/discord/384138149686935562?label=Discord&logo=discord&logoColor=fff"></a>
</div>

# Requirements

- Node.js LTS installed
- (optional) MySQL or PostgreSQL database
- Windows, Linux or MacOS host

# Quick  Start

### With Node.js
1. Clone the repository or download the files from the `main` branch
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill out all necessary information in the `.env` file.
4. Run `npm start`

### With Docker

* See `docker/compose.yml` for an example Docker Compose file.

See [documentation](./documentation/index.md) for more info!

# Migrating from XAseco?

1. Export your old XAseco database with `mysqldump -u root -p databasename > xaseco.sql`
2. Move `xaseco.sql` to the main folder of MINIcontrol
3. Run in MINIControl folder: `tsx --env-file=.env xaseco.ts xaseco.sql`
4. Start MINIcontrol

# Migrating from PyPlanet?

1. Export your old XAseco database with `mysqldump -u root -p databasename > pyplanet.sql`
2. Move `xaseco.sql` to the main folder of MINIcontrol
3. Run in MINIControl folder: `tsx --env-file=.env pyplanet.ts pyplanet.sql`
4. Start MINIcontrol

# Contributing
See the documentation in `documentation/devs` to read more about the core concept of MINIcontrol and how plugins work.

If you want to contribute changes or plugins to MINIcontrol, please open up an `Issue` first before you start working on things, so we can discuss the details of implementation, etc.

We will not respond to random pull requests.

### If you want to test your core changes in Docker:

* Build a local docker image: `docker build -t minicontrol:test -f docker/Dockerfile . `
