import { type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import Plugin from "core/plugins";
import { Score } from "schemas/scores";
import { Player } from "schemas/players";
import { eq, asc, and, sql } from "drizzle-orm";
import { escape, removeLinks } from "core/utils";
import tm from 'tm-essentials';
import { colors } from "core/utils";
import fs from "fs";

export class Record {
    login: string = "";
    nickname: string = "";
    rank: number = 0;
    time: number = 0;
    avgTime: number = 0;
    totalFinishes: number = 0;
    checkpoints: string = "";
    created_at: string = "";
    updated_at: string = "";

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
        this.created_at = score.created_at;
        this.updated_at = score.updated_at;
        return this;
    }
}

export default class Records extends Plugin {
    depends: string[] = ["database"];
    db: BunSQLiteDatabase | null = null;
    records: Record[] = [];
    currentMapUid: string = "";
    limit: number = 100;
    widgetId: string = "";
    widgetTemplate: string = "";
    widgetAction: number = -1;

    async onLoad() {
        if (!tmc.storage['sqlite']) return;
        this.db = tmc.storage['sqlite'];
        this.widgetId = tmc.ui.uuid();
        this.widgetTemplate = fs.readFileSync(import.meta.dir + "/templates/widget.twig", "utf8");
        // this.widgetAction = tmc.ui.addAction(this.widgetClick.bind(this));
        tmc.server.on("Trackmania.BeginMap", this.onBeginMap.bind(this));
        tmc.server.on("TMC.PlayerFinish", this.onPlayerFinish.bind(this));
    }

    async onUnload() {
        this.db = null;
        tmc.server.removeListener("Trackmania.BeginMap", this.onBeginMap.bind(this));
        tmc.server.removeListener("TMC.PlayerFinish", this.onPlayerFinish.bind(this));
    }

    async onInit() {
        tmc.debug("[Records] onInit");
        if (!this.db) return;
        if (!tmc.maps.currentMap?.UId) return;
        this.currentMapUid = tmc.maps.currentMap.UId;
        this.syncRecords(tmc.maps.currentMap.UId);
    }

    async onBeginMap(data: any) {
        const map = data[0];
        this.currentMapUid = map.UId;
        this.syncRecords(map.UId);
    }

    async syncRecords(mapUuid: string) {
        if (!this.db) return;
        const scores: any = this.db.select().from(Score).leftJoin(Player, eq(Score.login, Player.login)).where(eq(Score.mapUuid, mapUuid)).orderBy(asc(Score.time), asc(Score.updated_at)).all();
        this.records = [];
        let rank = 1;
        for (const data of scores) {
            const score: any = data.records;
            const player: any = data.player;
            this.records.push(new Record().fromScore({
                rank: rank,
                login: score.login,
                nickname: player.nickname,
                time: score.time,
                avgTime: score.avgTime,
                totalFinishes: score.totalFinishes,
                checkpoints: score.checkpoints,
                created_at: score.created_at,
                updated_at: score.updated_at,

            }));
            rank += 1;
        }
        await this.updateWidget();
        tmc.server.emit("Plugin.Records.onSync", this.records);
    }

    async onPlayerFinish(data: any) {
        const login = data[0];
        if (this.records.length == 0) {
            let ranking = await tmc.server.call("GetCurrentRankingForLogin", login);
            ranking = ranking[0];

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
            newRecord.rank = 1;
            this.records.push(newRecord);
            await this.db?.insert(Score).values({
                login: newRecord.login,
                time: newRecord.time,
                avgTime: newRecord.avgTime,
                totalFinishes: newRecord.totalFinishes,
                checkpoints: newRecord.checkpoints,
                created_at: newRecord.created_at,
                updated_at: newRecord.updated_at,
                mapUuid: this.currentMapUid
            });
            tmc.server.emit("Plugin.Records.onUpdate", newRecord, this.records);
            await this.updateWidget();
            return;
        }

        const lastIndex = this.records.length > this.limit ? this.limit : this.records.length;
        const lastRecord = this.records[lastIndex - 1];

        let ranking = await tmc.server.call("GetCurrentRankingForLogin", login);
        ranking = ranking[0];

        if (ranking.BestTime >= lastRecord.time) return;
        const time = ranking.BestTime;
        const record = this.records.find(r => r.login === login);
        if (record) {
            if (time < record.time) {
                record.nickname = removeLinks(ranking.NickName);
                record.avgTime = record.avgTime + (time - record.avgTime) / record.totalFinishes;
                record.time = ranking.BestTime;
                record.checkpoints = ranking.BestCheckpoints.join(",");
                record.totalFinishes++;
                record.updated_at = new Date().toISOString();
                await this.db?.update(Score).set({
                    time: record.time,
                    avgTime: record.avgTime,
                    checkpoints: record.checkpoints,
                    totalFinishes: record.totalFinishes,
                    updated_at: record.updated_at
                }).where(and(eq(Score.login, login), eq(Score.mapUuid, this.currentMapUid)));
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
                created_at: newRecord.created_at,
                updated_at: newRecord.updated_at,
                mapUuid: this.currentMapUid
            });
        }
        // Sort records
        this.records.sort((a, b) => {
            if (a.time === b.time) {
                return a.updated_at.localeCompare(b.updated_at);
            }
            return a.time - b.time;
        });
        // Update ranks
        for (let i = 0; i < this.records.length; i++) {
            this.records[i].rank = i + 1;
            if (i >= this.limit) {
                tmc.cli(`Deleting record ${i} because it's out of limit.`);
                await this.db?.delete(Score).where(and(eq(Score.login, this.records[i].login), eq(Score.mapUuid, this.currentMapUid)));
            }
        }
        this.records = this.records.slice(0, this.limit);
        await this.updateWidget();
    }

    async updateWidget() {
        let outRecords = [];
        let x = 0;
        for (let record of this.records) {
            if (x >= 10) break;
            outRecords.push(
                {
                    rank: record.rank,
                    nickname: escape(record.nickname),
                    time: tm.Time.fromMilliseconds(record.time).toTmString().replace(/^0:/, ""),
                });
            x += 1;
        }
        const lastRecord: any = this.records[this.records.length - 1];
        if (lastRecord != undefined && lastRecord.Rank > 10) {
            outRecords.push(
                {
                    rank: lastRecord.Rank,
                    nickname: escape(lastRecord.NickName),
                    time: tm.Time.fromMilliseconds(lastRecord.Best).toTmString().replace(/^0:/, ""),
                }
            )
        }
        const xml = tmc.ui.render(this.widgetTemplate, { records: outRecords, id: this.widgetId, colors: colors, action: this.widgetAction });
        await tmc.ui.display(xml);
    }

    async widgetClick(login: string, data: any) {
        tmc.chatCmd.execute(login, "/records");
    }
}