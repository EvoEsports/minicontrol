import { type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import Plugin from "core/plugins";
import { Score } from "core/schemas/scores";
import { Player } from "core/schemas/players";
import { eq, asc, and } from "drizzle-orm";
import { clone, escape, removeLinks, formatTime } from "core/utils";

import RecordsWindow from "core/plugins/records/recordsWindow.ts";

export class Record {
    login: string = "";
    nickname: string = "";
    rank: number = 0;
    time: number = 0;
    avgTime: number = 0;
    totalFinishes: number = 0;
    checkpoints: string = "";
    createdAt: string = "";
    updatedAt: string = "";

    fromScore(score: any) {
        if (score.rank) {
            this.rank = score.rank;
        }
        this.login = score.login;
        if (score.nickname) {
            this.nickname = score.nickname;
        }
        this.time = score.time;
        this.avgTime = score.avgTime;
        this.totalFinishes = score.totalFinishes;
        this.checkpoints = score.checkpoints;
        this.createdAt = score.createdAt;
        this.updatedAt = score.updatedAt;
        return this;
    }
}

export default class Records extends Plugin {
    static depends: string[] = ["database"];
    db: BunSQLiteDatabase | null = null;
    records: Record[] = [];
    currentMapUid: string = "";
    limit: number = 100;


    async onLoad() {
        if (!tmc.storage['sqlite']) return;
        this.db = tmc.storage['sqlite'];
        tmc.server.addListener("Trackmania.BeginMap", this.onBeginMap, this);
        tmc.server.addListener("TMC.PlayerFinish", this.onPlayerFinish, this);
        tmc.chatCmd.addCommand("/records", this.cmdRecords.bind(this), "Display records");
    }

    async onUnload() {
        this.db = null;
        tmc.server.removeListener("Trackmania.BeginMap", this.onBeginMap.bind(this));
        tmc.server.removeListener("TMC.PlayerFinish", this.onPlayerFinish.bind(this));
        tmc.chatCmd.removeCommand("/records");
    }

    async onStart() {
        const menu = tmc.storage["menu"];
        if (menu) {
            menu.addItem({
                category: "Map",
                title: "Show: Records",
                action: "/records"
            });
        }
        if (!this.db) return;
        if (!tmc.maps.currentMap?.UId) return;
        this.currentMapUid = tmc.maps.currentMap.UId;
        await this.syncRecords(tmc.maps.currentMap.UId);


    }

    async onBeginMap(data: any) {
        const map = data[0];
        this.currentMapUid = map.UId;
        await this.syncRecords(map.UId);
    }

    async cmdRecords(login: string, args: string[]) {
        let records = [];
        for (let record of this.records) {
            records.push(
                {
                    rank: record.rank,
                    nickname: escape(record.nickname),
                    login: record.login,
                    time: "$o" + formatTime(record.time),
                });
        }
        const window = new RecordsWindow(login, this);
        window.size = { width: 90, height: 95 };
        window.title = `Server Records [${this.records.length}]`;
        window.setItems(records);
        window.setColumns([
            { key: "rank", title: "Rank", width: 10 },
            { key: "nickname", title: "Nickname", width: 50 },
            { key: "time", title: "Time", width: 20 },
        ]);
        if (tmc.admins.includes(login)) {
            window.size.width = 105;
            window.setActions(["Delete"]);
        }
        await window.display();
    }

    async syncRecords(mapUuid: string) {
        if (!this.db) return;
        const scores: any = this.db.select({
            login: Score.login,
            nickname: Player.nickname,
            time: Score.time,
            avgTime: Score.avgTime,
            totalFinishes: Score.totalFinishes,
            checkpoints: Score.checkpoints,
            createdAt: Score.createdAt,
            updatedAt: Score.updatedAt,
        }).from(Score).leftJoin(Player, eq(Score.login, Player.login)).where(eq(Score.mapUuid, mapUuid)).orderBy(asc(Score.time), asc(Score.updatedAt)).all();
        
        this.records = [];
        let rank = 1;
        for (const score of scores) {            
            score.rank = rank;
            this.records.push(new Record().fromScore(score));
            rank += 1;
        }

        tmc.server.emit("Plugin.Records.onSync", {
            mapUid: mapUuid,
            records: clone(this.records)
        });
    }

    async deleteRecord(login: string, data: any) {
        if (!this.db) return;
        if (!tmc.admins.includes(login)) return;
        const msg = (`¤info¤Deleting map record for ¤white¤${data.nickname} ¤info¤(¤white¤${data.login}¤info¤)`);
        tmc.cli(msg);
        tmc.chat(msg, login);
        try {
            await this.db?.delete(Score).where(and(eq(Score.login, data.login), eq(Score.mapUuid, this.currentMapUid)));
            this.records = this.records.filter(r => r.login !== data.login);
            tmc.server.emit("Plugin.Records.onRefresh", {
                records: clone(this.records),
            });
            await this.cmdRecords(login, []);
        } catch (err: any) {
            const msg = (`Error deleting record: ${err.message}`);
            tmc.cli(msg);
            tmc.chat(msg, login);
        }
    }

    async getRankingsForLogin(data: any) {
        const login = data[0];
        if (tmc.game.Name === "TmForever") {
            const ranking = await tmc.server.call("GetCurrentRankingForLogin", login);
            return ranking[0];
        }

        return {
            login: login,
            NickName: (await tmc.players.getPlayer(login)).nickname,
            BestTime: data[1],
            BestCheckpoints: [],
        };
    }

    async onPlayerFinish(data: any) {
        const login = data[0];
        if (this.records.length == 0) {
            let ranking = await this.getRankingsForLogin(data);
            const newRecord = new Record().fromScore({
                login: login,
                nickname: removeLinks(ranking.NickName),
                time: ranking.BestTime,
                avgTime: ranking.BestTime,
                totalFinishes: 1,
                checkpoints: ranking.BestCheckpoints.join(","),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            newRecord.rank = 1;
            this.records.push(newRecord);
            await this.db?.insert(Score).values({
                login: newRecord.login,
                time: newRecord.time,
                avgTime: newRecord.avgTime,
                totalFinishes: newRecord.totalFinishes,
                checkpoints: newRecord.checkpoints,
                createdAt: newRecord.createdAt,
                updatedAt: newRecord.updatedAt,
                mapUuid: this.currentMapUid
            });
            tmc.server.emit("Plugin.Records.onNewRecord", {
                oldRecord: null,
                record: clone(newRecord || {}),
                records: clone(this.records)
            });
            return;
        }

        const lastIndex = this.records.length > this.limit ? this.limit : this.records.length;
        const lastRecord = this.records[lastIndex - 1];

        let ranking = await this.getRankingsForLogin(data);

        if (lastIndex >= this.limit && ranking.BestTime >= lastRecord.time) return;
        const time = ranking.BestTime;
        const oldRecord = this.records.find(r => r.login === login);
        if (oldRecord) {
            if (ranking.BestTime >= oldRecord.time) return;
            if (time < oldRecord.time) {
                const newRecord = clone(oldRecord);
                newRecord.nickname = removeLinks(ranking.NickName);
                newRecord.avgTime = newRecord.avgTime + (time - newRecord.avgTime) / newRecord.totalFinishes;
                newRecord.time = ranking.BestTime;
                newRecord.checkpoints = ranking.BestCheckpoints.join(",");
                newRecord.totalFinishes++;
                newRecord.updatedAt = new Date().toISOString();
                await this.db?.update(Score).set({
                    time: newRecord.time,
                    avgTime: newRecord.avgTime,
                    checkpoints: newRecord.checkpoints,
                    totalFinishes: newRecord.totalFinishes,
                    updatedAt: newRecord.updatedAt
                }).where(and(eq(Score.login, login), eq(Score.mapUuid, this.currentMapUid)));
                this.records[this.records.findIndex(r => r.login === login)] = newRecord;
            }
        } else {
            const newRecord = new Record().fromScore({
                login: login,
                nickname: removeLinks(ranking.NickName),
                time: ranking.BestTime,
                avgTime: ranking.BestTime,
                totalFinishes: 1,
                checkpoints: ranking.BestCheckpoints.join(","),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
            this.records.push(newRecord);
            await this.db?.insert(Score).values({
                login: newRecord.login,
                time: newRecord.time,
                avgTime: newRecord.avgTime,
                totalFinishes: newRecord.totalFinishes,
                checkpoints: newRecord.checkpoints,
                createdAt: newRecord.createdAt,
                updatedAt: newRecord.updatedAt,
                mapUuid: this.currentMapUid
            });
        }
        // Sort records
        this.records.sort((a, b) => {
            if (a.time === b.time) {
                return a.updatedAt.localeCompare(b.updatedAt);
            }
            return a.time - b.time;
        });
        // Update ranks
        let newRecord = {};
        for (let i = 0; i < this.records.length; i++) {
            this.records[i].rank = i + 1;
            if (this.records[i].login === login) {
                newRecord = this.records[i];
            }
            if (i >= this.limit) {
                tmc.cli(`Deleting record ${i} because it's out of limit.`);
                await this.db?.delete(Score).where(and(eq(Score.login, this.records[i].login), eq(Score.mapUuid, this.currentMapUid)));
            }
        }
        this.records = this.records.slice(0, this.limit);
        tmc.server.emit("Plugin.Records.onUpdateRecord", {
            oldRecord: clone(oldRecord || {}),
            record: clone(newRecord),
            records: clone(this.records)
        });
    }

}