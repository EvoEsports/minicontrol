# Database

The Database manager is responsible for connecting to the configured database, running migrations and exposing models and helpers for plugins.

Key responsibilities:

- Connects via Sequelize (sequelize-typescript) and chooses driver based on the `DATABASE` environment variable (sqlite/mysql/postgres).
- Runs migrations using Umzug from `./core/migrations/*.ts`, `./userdata/migrations/*.ts`, and plugin provided migrations in `./userdata/plugins/**/migrations/*.ts`.
- Registers and exposes first-party models from `core/schemas/*` such as `map.model.ts` (`TmMap`) and `players.model.ts` (`Player`).
- Provides `addModels(models: ModelCtor[])` so plugins can register their own models so they are recognized by the running Sequelize instance.
- Listens for runtime events like `TMC.PlayerConnect`, `TMC.PlayerDisconnect` and `Trackmania.EndMap` to synchronize runtime state with the DB.

Example usage for plugin authors:

```ts
import MyModel from './schemas/myplugin.model';

class MyPlugin extends Plugin {
  async onLoad() {
    // register model with the running Sequelize instance
    tmc.database.addModels([MyModel]);
  }
}
```

Direct access to the Sequelize instance is available via `tmc.database.sequelize` when initialized. If you need to run raw queries or transactions, prefer using the Sequelize API and existing models to ensure compatibility.

Recommended patterns:

- Use models exported from `core/schemas/*` to interact with core tables instead of direct SQL.
- Place per-plugin migrations under `userdata/plugins/<id>/migrations/*.ts` so they run automatically with the core migrations at startup.
- Avoid performing heavy synchronous operations in migrations or startup; keep them idempotent and reversible.
