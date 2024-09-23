import Plugin from "@core/plugins";
import Score from "@core/schemas/scores.model";
import Player from "@core/schemas/players.model";
import { clone, escape, removeLinks, formatTime, removeColors } from "@core/utils";
import RecordsWindow from "./recordsWindow";
import { Op } from "sequelize";

export default class Records extends Plugin {
    static depends: string[] = ["database"];
    records: Score[] = [];
    currentMapUid: string = "";
    limit: number = 100;

    async onLoad() {
        tmc.storage['db'].addModels([Score]);
        tmc.server.addListener("Trackmania.BeginMap", this.onBeginMap, this);
        tmc.server.addListener("TMC.PlayerFinish", this.onPlayerFinish, this);
        tmc.chatCmd.addCommand("/records", this.cmdRecords.bind(this), "Display records");
    }

    async onUnload() {
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
        for (const record of this.records) {
            records.push(
                {
                    rank: record.rank,
                    nickname: escape(record.player.nickname ?? ""),
                    login: record.login,
                    time: "$o" + formatTime(record.time ?? 0),
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
        const scores = await Score.findAll({
            where: {
                mapUuid: mapUuid
            },
            order: [
                // Will escape title and validate DESC against a list of valid direction parameters
                ['time', 'ASC'],
                ['updatedAt', 'ASC'],
            ],
            include: [Player],
        });

        this.records = [];
        let rank = 1;
        for (const score of scores) {
            score.rank = rank;
            this.records.push(score);
            rank += 1;
        }

        tmc.server.emit("Plugin.Records.onSync", {
            mapUid: mapUuid,
            records: clone(this.records)
        });
    }

    async deleteRecord(login: string, data: any) {
        if (!tmc.admins.includes(login)) return;
        const msg = (`¤info¤Deleting map record for ¤white¤${data.nickname} ¤info¤(¤white¤${data.login}¤info¤)`);
        tmc.cli(msg);
        tmc.chat(msg, login);
        try {
            await Score.destroy({
                where: {
                    [Op.and]: {
                        login: data.login,
                        mapUuid: this.currentMapUid
                    }
                }
            });

            this.records = this.records.filter(r => r.login !== data.login);

            let rank = 1;
            for (const score of this.records) {
                score.rank = rank;
                rank += 1;
            }

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
        try {
            if (this.records.length == 0) {
                let ranking = await this.getRankingsForLogin(data);
                await Score.create({
                    login: login,
                    time: ranking.BestTime,
                    checkpoints: ranking.BestCheckpoints.join(","),
                    mapUuid: this.currentMapUid,
                });
                const newRecord = await Score.findOne(
                    {
                        where: {
                            [Op.and]: {
                                login: login,
                                mapUuid: this.currentMapUid
                            }
                        },
                        include: Player
                    });
                newRecord.rank = 1;

                this.records.push(newRecord);
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

            if (lastIndex >= this.limit && lastRecord && ranking.BestTime >= lastRecord.time) return;
            const time = ranking.BestTime;
            const record = this.records.find(r => r.login === login);
            let oldRecord = clone(record);
            if (record) {
                if (ranking.BestTime >= record.time) return;
                if (time < record.time) {
                    record.update({
                        time: ranking.BestTime,
                        checkpoints: ranking.BestCheckpoints.join(",")
                    });
                    this.records[this.records.findIndex(r => r.login === login)] = record;
                }
            } else {
                await Score.create({
                    mapUuid: this.currentMapUid,
                    login: login,
                    time: ranking.BestTime,
                    checkpoints: ranking.BestCheckpoints.join(","),
                });
                const newRecord = await Score.findOne(
                    {
                        where: {
                            [Op.and]: {
                                login: login,
                                mapUuid: this.currentMapUid
                            }
                        },
                        include: Player
                    }
                );
                this.records.push(newRecord);
            }
            // Sort records
            this.records.sort((a, b) => {

                if (a.time === b.time) {
                    const str = a.updatedAt.toString();
                    return str.localeCompare(b.updatedAt.toString());
                }
                return a.time - b.time;
            });

            // Update ranks
            let outRecord = {};
            for (let i = 0; i < this.records.length; i++) {
                this.records[i].rank = i + 1;

                if (this.records[i].login == login) {
                    outRecord = this.records[i];
                }
                if (i >= this.limit) {
                    tmc.cli(`Deleting record ${i} because it's out of limit.`);
                    await Score.destroy({
                        where: {
                            [Op.and]: {
                                login: this.records[i].login,
                                mapUuid: this.currentMapUid
                            }
                        }
                    });
                }
            }

            this.records = this.records.slice(0, this.limit);
            tmc.server.emit("Plugin.Records.onUpdateRecord", {
                oldRecord: oldRecord || {},
                record: clone(outRecord),
                records: clone(this.records)
            });
        } catch (e: any) {
            console.log(e);
        }
    }
}