import { type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import Plugin from "core/plugins";
import { Score } from "schemas/scores";
import { Player } from "schemas/players";
import { eq, asc, and } from "drizzle-orm";
import { clone, escape, removeLinks } from "core/utils";
import tm from 'tm-essentials';
import Widget from 'core/ui/widget';
import ListWindow from 'core/ui/listwindow';

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
    widget: Widget | null = null;

    async onLoad() {
        if (!tmc.storage['sqlite']) return;
        this.db = tmc.storage['sqlite'];
        let widgetFile = "core/plugins/records/widget.twig"
        if (tmc.game.Name === "TmForever") {
            widgetFile = "core/plugins/records/widget_tmnf.twig";
        }
        this.widget = new Widget(widgetFile);
        this.widget.title = "Records";
        this.widget.pos = { x: 115, y: 30 };
        this.widget.size = { width: 45, height: 45 };
        this.widget.setOpenAction(this.widgetClick.bind(this));
        tmc.server.addListener("Trackmania.BeginMap", this.onBeginMap, this);
        tmc.server.addListener("TMC.PlayerFinish", this.onPlayerFinish, this);
        tmc.chatCmd.addCommand("/records", this.cmdRecords.bind(this), "Display records");
    }

    async onUnload() {
        this.db = null;
        this.widget?.destroy();
        this.widget = null;
        tmc.server.removeListener("Trackmania.BeginMap", this.onBeginMap.bind(this));
        tmc.server.removeListener("TMC.PlayerFinish", this.onPlayerFinish.bind(this));
        tmc.chatCmd.removeCommand("/records");
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
   
    async cmdRecords(login: string, args: string[]) {
        let records = [];
        for (let record of this.records) {
            records.push(
                {
                    rank: record.rank,
                    nickname: escape(record.nickname),
                    time: "$o" + tm.Time.fromMilliseconds(record.time).toTmString().replace(/^0:/, ""),
                });
        }
        const window = new ListWindow(login);
        window.size = { width: 90, height: 100 };
        window.title = "records";
        window.setItems(records);
        window.setColumns([
            { key: "rank", title: "Rank", width: 10 },
            { key: "nickname", title: "Nickname", width: 50 },
            { key: "time", title: "Time", width: 20 },
        ]);
        await window.display();
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
        tmc.server.emit("Plugin.Records.onSync", {
            mapUid: mapUuid,
            records: clone(this.records)
        });
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
            tmc.server.emit("Plugin.Records.onNewRecord", {
                oldRecord: null,
                record: newRecord
            }, clone(this.records));
            await this.updateWidget();
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
                newRecord.updated_at = new Date().toISOString();
                await this.db?.update(Score).set({
                    time: newRecord.time,
                    avgTime: newRecord.avgTime,
                    checkpoints: newRecord.checkpoints,
                    totalFinishes: newRecord.totalFinishes,
                    updated_at: newRecord.updated_at
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
            oldRecord: clone(oldRecord || {} ),
            record: newRecord
        }, clone(this.records));
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

        if (this.widget) {
            this.widget.setData({
                records: outRecords
            });
            this.widget.size = { width: 45, height: 4 * outRecords.length + 1 };
            this.widget.display();
        }
    }

    async widgetClick(login: string, data: any) {
        tmc.chatCmd.execute(login, "/records");
    }
}