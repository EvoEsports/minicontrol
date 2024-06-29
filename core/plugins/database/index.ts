import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { eq, inArray, sql } from "drizzle-orm";
import type { Logger } from 'drizzle-orm/logger';
import type { Player as PlayerType } from 'core/playermanager';
import { Player } from 'core/schemas/players';
import Plugin from 'core/plugins';
import { Map as DbMap } from 'core/schemas/map';
import { chunkArray } from 'core/utils';

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
        tmc.server.addListener("Trackmania.MapListModified", this.onMapListModified, this);
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
        await this.syncMaps();
    }

    async onPlayerConnect(player: any) {
        await this.syncPlayer(player);
    }

    async syncPlayer(player: PlayerType) {
        if (!tmc.storage['sqlite']) return;
        const db: BetterSQLite3Database = tmc.storage['sqlite'];
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
        const players = tmc.players.getAll();
        for (const player of players) {
            await this.syncPlayer(await tmc.players.getPlayer(player.login));
        }
    }

    async onMapListModified(data: any) {
        if (data[2] === true) {
            await this.syncMaps();
        }
    }

    async syncMaps() {
        if (!tmc.storage['sqlite']) return;
        const db: BetterSQLite3Database = tmc.storage['sqlite'];

        const serverUids = tmc.maps.getUids();
        const result = await db.select().from(DbMap).where(inArray(DbMap.uuid, serverUids)).all();
        const dbUids = result.map((value) => value.uuid);
        const missingUids = chunkArray(serverUids.filter(item => dbUids.indexOf(item) < 0), 50);
        for (const groups of missingUids) {  
            let missingMaps: any[] = [];
            for (const uid of groups) {
                const map = tmc.maps.getMap(uid);
                if (!map) continue;
                const outMap = {
                    uuid: map.UId,
                    name: map.Name,
                    author: map.Author,
                    authorNickname: map.AuthorNickname ?? "",
                    authorTime: map.AuthorTime,
                    environment: map.Environnement,
                    created_at: sql`CURRENT_TIMESTAMP`,
                    updated_at: sql`CURRENT_TIMESTAMP`,
                };
                missingMaps.push(outMap);
            }

            try {
                if (missingMaps.length > 0)
                    await db.insert(DbMap).values(missingMaps);
            } catch (e: any) {
                tmc.cli(`¤error¤` + e.message);
            }
        }
    }
}