import Plugin from "@core/plugins";

declare module "@core/plugins" {
    interface PluginRegistry {
        "database": Database;
    }
}

export default class Database extends Plugin {
    async onLoad() {
        if (!tmc.database.sequelize) {
            tmc.cli("$fffDatabase not initialized! Unloading database plugin...");
            await tmc.unloadPlugin("database");
        }
    }
}