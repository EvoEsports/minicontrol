import Plugin from "@core/plugins";


export default class Database extends Plugin {
    async onLoad() {
        if (!tmc.database.sequelize) {
            tmc.cli("$fffDatabase not initialized! Unloading database plugin...");
            await tmc.unloadPlugin("database");
        }
    }
}