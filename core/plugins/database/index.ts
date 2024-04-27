import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { Database } from 'bun:sqlite';
import { eq } from "drizzle-orm";
import type { Logger } from 'drizzle-orm/logger';
import type { Player as PlayerType } from 'core/playermanager';
import { Player } from 'core/schemas/players';
import Plugin from 'core/plugins';

class SqliteLogger implements Logger {
    logQuery(query: string, params: unknown[]): void {
        tmc.debug(`$d7c${query}`);
    }
}

export default class SqliteDb extends Plugin {

    async onLoad() {
        const sqlite = new Database(process.cwd() + '/userdata/local.sqlite');
        const client = drizzle(sqlite, {
            logger: new SqliteLogger()         
        });
        console.log("Running Migrates...");
        try {
            migrate(client, {
                migrationsFolder: "./userdata/drizzle"
            });
        } catch (e: any) {
            tmc.cli("¤error¤Error running migrations: ¤white¤" + e.message);
            process.exit(1);
        }

        tmc.storage['sqlite'] = client;
        tmc.cli("¤success¤Database connected.");
        tmc.server.addListener("TMC.PlayerConnect", this.onPlayerConnect, this);
    }

    async onUnload() {
        if (tmc.storage['sqlite']) {
            await tmc.storage['sqlite'].close();
            delete (tmc.storage['sqlite']);
        }
        tmc.server.removeListener("TMC.PlayerConnect", this.onPlayerConnect.bind(this));
    }

    async onStart() {
        await this.syncPlayers();
    }

    async onPlayerConnect(player: any) {
        await this.syncPlayer(player);
    }

    async syncPlayer(player: PlayerType) {
        if (!tmc.storage['sqlite']) return;
        const db: BunSQLiteDatabase = tmc.storage['sqlite'];
        const query = await db.select().from(Player).where(eq(Player.login, player.login));
        if (query.length == 0) {
            await db.insert(Player).values({
                login: player.login,
                nickname: player.nickname,
            });
        } else {
            await db.update(Player).set({
                nickname: player.nickname,
            }).where(eq(Player.login, player.login));

            if (query[0] && query[0].customNick) {
                tmc.cli("Setting nickname to " + query[0].customNick);
                player.set("nickname", query[0].customNick);
            }
        }
    }

    async syncPlayers() {
        const players = tmc.players.get();
        for (const player of players) {
            await this.syncPlayer(await tmc.players.getPlayer(player.login));
        }
    }
}