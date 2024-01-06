import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { Database } from 'bun:sqlite';
import { eq } from "drizzle-orm";
import type { Logger } from 'drizzle-orm/logger';
import { sleep } from 'bun';
import type { Player as PlayerType } from 'core/playermanager';
import { Player } from 'schemas/players';
import Plugin from 'core/plugins';

class SqliteLogger implements Logger {
    logQuery(query: string, params: unknown[]): void {
        tmc.debug(`$d7c${query}` );
    }
}

export default class SqliteDb extends Plugin {

    async onLoad() {
        const sqlite = new Database(process.cwd() + '/local.sqlite');
        const client = drizzle(sqlite, {
            logger: new SqliteLogger()
        });
        console.log("Running Migrates...");
        try {
            migrate(client, {
                migrationsFolder: "./drizzle"
            });
        } catch (e: any) {
            tmc.cli("¤error¤Error running migrations: $fff" + e.message);
            process.exit(1);
        }

        tmc.storage['sqlite'] = client;
        tmc.cli("¤success¤Database connected.");
        tmc.server.on("Trackmania.PlayerConnect", this.onPlayerConnect.bind(this));
    }

    async onUnload() {
        if (tmc.storage['sqlite']) {
            await tmc.storage['sqlite'].close();
            delete (tmc.storage['sqlite']);
        }
        tmc.server.removeListener("Trackmania.PlayerConnect", this.onPlayerConnect.bind(this));
    }

    async onInit() {
        await this.syncplayers();
    }

    async onPlayerConnect(data: any) {
        const login = data[0];
        await sleep(50); // wait for player to be ready
        const player = await tmc.getPlayer(login);
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


    async syncplayers() {
        const players = tmc.players.get();
        for (const player of players) {
            await this.syncPlayer(await tmc.players.getPlayer(player.login));
        }
    }
}