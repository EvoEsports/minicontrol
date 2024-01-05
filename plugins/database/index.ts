import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { Database } from 'bun:sqlite';
import { eq } from "drizzle-orm";
import type { Logger } from 'drizzle-orm/logger';
import * as schema from './schema';
import { sleep } from 'bun';
import type { Player } from 'core/playermanager';
import Plugin from 'core/plugins';

class SqliteLogger implements Logger {
    logQuery(query: string, params: unknown[]): void {
        console.log({ query, params });
    }
}

export default class SqliteDb extends Plugin {

    async onLoad() {
        const sqlite = new Database(process.cwd() + '/local.sqlite');
        const client = drizzle(sqlite, {
            logger: new SqliteLogger()
        });
        console.log("Running Migrates...");
        migrate(client, {
            migrationsFolder: "./drizzle"
        });
        tmc.storage['db'] = client;
        tmc.cli("¤success¤Database connected.");
        tmc.server.on("Trackmania.PlayerConnect", this.onPlayerConnect.bind(this));
    }

    async onUnload() {
        if (tmc.storage['db']) {
            await tmc.storage['db'].close();
            delete (tmc.storage['db']);
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

    async syncPlayer(player: Player) {
        if (!tmc.storage['db']) return;
        const db: BunSQLiteDatabase = tmc.storage['db'];
        const query = await db.select().from(schema.players).where(eq(schema.players.login, player.login));
        if (query.length == 0) {
            await db.insert(schema.players).values({
                login: player.login,
                nickname: player.nickname,
            });
        } else {
            await db.update(schema.players).set({
                nickname: player.nickname,
            }).where(eq(schema.players.login, player.login));

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