# Project Conventions

## Architecture

- MiniControl: modular plugin framework for Trackmania server control
- Core: `core/` — managers for maps, players, commands, UI, settings, server
- Plugins: `userdata/plugins/<id>/` — each with `manifest.json` + `index.ts`
- Kacky plugins: `userdata/plugins/kacky/` — the suite that bridges to KackyGG backend
- Data: Sequelize ORM (SQLite/MySQL/PostgreSQL), migrations via umzug
- Transport: XML-RPC to TM Dedicated Server

## Engineering Standards

- Apply SOLID principles by default for behavior-changing code.
- Refactor continuously when touching code, as long as validation remains green.
- Give direct, specific technical feedback in reviews.
- Include concrete verification evidence (commands and outcomes) in delivery notes.
- Follow existing codebase conventions before introducing new patterns.
- Keep changes narrow, reversible, and well-scoped.

## Plugin Conventions

- Each plugin folder must have `manifest.json` (id, version, requiresMinicontrolVersion) and `index.ts`
- Extend `Plugin` class — never hardcode server/guild IDs
- Declare module augmentation: `declare module "@core/plugins"` for type safety
- Use `this.getSetting(key)` / `this.setSetting(key, value)` for plugin settings
- Redis Streams: consumer groups per topic, `XREADGROUP` with block, explicit ACK
- REST calls to backend: centralized in `web.api.ts` — don't scatter HTTP calls

## Collaboration Protocol

- Plan before implementation for non-trivial tasks.
- Explain intended changes before editing files.
- Keep updates concise, concrete, and action-focused.
- Challenge weak assumptions and propose better alternatives when needed.
