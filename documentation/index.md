<div align="center">
    <img src="../images/minicontrol.png" width="60%" />
    <br>
    <img alt="GitHub" src="https://img.shields.io/github/license/EvoEsports/minicontrol?label=License" />
    <img alt="GitHub Tag" src="https://img.shields.io/github/v/tag/evoesports/minicontrol?label=Current%20Version" />
    <img alt="NodeJS" src="https://img.shields.io/badge/node.js-6DA55F?logo=node.js&logoColor=white" />
    <a href="https://discord.gg/evoesports"><img alt="Discord" src="https://img.shields.io/discord/384138149686935562?label=Discord&logo=discord&logoColor=fff"></a>
</div>

---

# MINIcontrol Documentation

Welcome! MINIcontrol is a lightweight controller for Trackmania servers designed for modular plugin-based extensibility. This documentation is organized for two main audiences:

- **Server Admins** — installation, deployment, and plugin management.
- **Plugin Developers** — API references, plugin lifecycle, UI components, and examples.

Need help? Join the [Evo Esports Discord](https://discord.gg/evoesports) in the `#minicontrol` channel or open an issue on GitHub.

> View the live docs site: [https://evoesports.github.io/minicontrol](https://evoesports.github.io/minicontrol) (deployed via MkDocs/GitHub Actions)

---
## Quick links

- Server Admins: [Installation & Setup](./users/install.md) ✅
- Plugin Managers: [Plugin management guide](./users/plugins.md)
- Developers: [Concept & architecture](./devs/concept.md) • [Plugins & API](./devs/plugins.md)
- UI System: [Manialink & Widget docs](./devs/ui-system.md) • [JSX & Forge](./devs/ui-system2.md) • [Forge API](./devs/forge.md)
- Class reference: [Core classes index](./devs/class/index.md)
- Examples: [Quickstart plugin and example plugin](./devs/quickstart-plugin.md)

---
## Repository & Reference Links

- Full repo: https://github.com/EvoEsports/minicontrol
- Releases & changelog: https://github.com/EvoEsports/minicontrol/releases
- Project README: [README.md](../README.md)

---
## What you'll find here

- A concise install guide (Node/Bun and Docker)
- Plugin lifecycle and the manifest/resolver system
- UI helpers for creating Manialinks, Widgets and Windows
- Managers for Players, Maps, Settings, Commands, Bills
- GBX XML-RPC integration (server transport layer)
- Migration & database guidance (SQLite local/dev and Postgres/MySQL for production)

---
## Quick Start (top tasks)

1. Clone repo and install dependencies:

```bash
git clone https://github.com/EvoEsports/minicontrol.git
cd minicontrol
npm install
```

2. Copy the environment file and configure credentials:

```bash
cp .env.example .env
# (Windows) PowerShell: Copy-Item .env.example .env
```

3. Run database migrations and start the controller in dev/production:

```bash
npm run migrate
npm start            # production (tsx)
npm run dev          # development (bun watch)
```

---
## Recommended next steps

- For admins: follow the [Install guide](./users/install.md) and review PLUGINS control.
- For developers: read [Concept](./devs/concept.md) then the [Plugins guide](./devs/plugins.md).
- Check sample `userdata/plugins/example-plugin` for a minimal plugin skeleton and templates.

---
## Compatibility & requirements

- Node.js >= 21.5.0 (recommended) or Bun (dev); `tsx` is used in the runtime to execute TypeScript.
- SQLite is used by default for quick local setups; for production use PostgreSQL or MySQL (set `DATABASE` accordingly).
- Supported server platforms include Trackmania (TM2020/TM2) and TmForever. Verify compatibility with plugin `requiresMinicontrolVersion`.

For detailed install and production recommendations, see the [Install guide](./users/install.md).

---
## Contributing, Reporting & Support

- Have a question or need help? Join the Evo Esports Discord: https://discord.gg/evoesports
- Found a bug? Open an issue: https://github.com/EvoEsports/minicontrol/issues
- PRs welcome: please open an issue first to discuss significant changes.

---
### License

MINIcontrol is released under the terms shown in the `LICENSE` file. Please review before contributing.
