import Plugin from "@core/plugins";
import Score from "@core/schemas/scores.model";
import Player from "@core/schemas/players.model";
import PersonalBest from "@core/schemas/personalBest.model";
import { clone, htmlEntities, formatTime } from "@core/utils";
import RecordsWindow from "./recordsWindow";
import { Op } from "sequelize";
import Menu from "../menu/menu";

export default class Records extends Plugin {
    static depends: string[] = ["database"];
    records: Score[] = [];
    private playerCheckpoints: { [login: string]: string[] } = {};
    personalBest: { [login: string]: PersonalBest } = {};
    private finishLocks: { [key: string]: Promise<any> } = {};

    async onLoad() {
        tmc.storage["db"].addModels([Score, PersonalBest]);
        tmc.chatCmd.addCommand("/records", this.cmdRecords.bind(this), "Display Records");
        tmc.settings.register("records.maxRecords", 100, this.settingMaxRecords.bind(this), "LocalRecords: Maximum number of records");
    }

    async onUnload() {
        tmc.server.removeListener("Trackmania.BeginMap", this.onBeginMap);
        tmc.server.removeListener("TMC.PlayerFinish", this.onPlayerFinish);
        tmc.server.removeListener("TMC.PlayerCheckpoint", this.onPlayerCheckpoint);
        tmc.chatCmd.removeCommand("/records");
    }

    async onStart() {
        Menu.getInstance().addItem({
            category: "Records",
            title: "Local Records",
            action: "/records",
        });
        await this.syncRecords(tmc.maps.currentMap.UId);

        tmc.server.addListener("Trackmania.BeginMap", this.onBeginMap, this);
        tmc.server.addListener("TMC.PlayerFinish", this.onPlayerFinish, this);
        tmc.server.addListener("TMC.PlayerCheckpoint", this.onPlayerCheckpoint, this);
        tmc.server.addListener("TMC.PlayerConnect", this.onPlayerConnect, this);
        if (tmc.game.Name === "TmForever") {
            tmc.server.addListener("Trackmania.EndMap", this.onEndRace, this);
        } else {
            tmc.server.addListener("Trackmania.EndMatch", this.onEndRace, this);
        }
    }

    async onBeginMap(data: any) {
        const map = data[0];
        this.personalBest = {};
        this.playerCheckpoints = {};
        this.records = [];
        await this.syncRecords(map.UId);
    }

    async onPlayerConnect(player: Player) {
        const login = player.login;
        if (!player || !login) return;
        try {
            const personalBest = await PersonalBest.findOne({
                where: {
                    [Op.and]: {
                        login: login,
                        mapUuid: tmc.maps.currentMap.UId,
                    },
                },
            });
            if (personalBest) {
                this.personalBest[login] = personalBest;
            }
        } catch (e: any) {
            tmc.cli(`¤error¤Error fetching personal best: ${e.message}`);
        }
    }

    async settingMaxRecords(value: any) {
        await this.syncRecords(tmc.maps.currentMap.UId);
    }

    async cmdRecords(login: string, args: string[]) {
        const records: any = [];
        let mapUuid = tmc.maps.currentMap.UId;

        if (args.length > 0) {
            mapUuid = args[0].trim() || tmc.maps.currentMap.UId;
        }

        for (const record of await this.getRecords(mapUuid)) {
            records.push({
                rank: record.rank,
                nickname: htmlEntities(record?.player?.customNick ?? record?.player?.nickname ?? ""),
                login: record.login,
                time: formatTime(record.time ?? 0),
                mapUuid: mapUuid,
            });
        }
        const map = tmc.maps.getMap(mapUuid) ?? tmc.maps.currentMap;
        const window = new RecordsWindow(login, this);
        window.size = { width: 100, height: 100 };
        window.title = `Server Records for ${htmlEntities(map.Name)}$z$s [${this.records.length}]`;
        window.setItems(records);
        window.setColumns([
            { key: "rank", title: "Rank", width: 10 },
            { key: "nickname", title: "Nickname", width: 50 },
            { key: "time", title: "Time", width: 20 },
        ]);

        window.setActions(["View"]);

        if (tmc.admins.includes(login)) {
            window.size.width = 115;
            window.setActions(["View", "Delete"]);
        }
        window.display();
    }

    async getRecords(mapUuid: string) {
        let scores: Score[] = [];
        try {
            scores = await Score.findAll({
                where: {
                    mapUuid: mapUuid,
                },
                order: [
                    ["time", "ASC"],
                    ["updatedAt", "ASC"],
                ],
                limit: tmc.settings.get("records.maxRecords"),
                include: [Player],
            });
        } catch (err: any) {
            tmc.cli(`Error fetching records: ${err.message}`);
            return [];
        }

        const records: Score[] = [];
        let rank = 1;
        for (const score of scores) {
            score.rank = rank;
            records.push(score);
            rank += 1;
        }

        // get personal best for each player
        this.personalBest = {};
        const pbs =
            (await PersonalBest.findAll({
                where: {
                    [Op.and]: {
                        login: {
                            [Op.in]: tmc.players.getAllLogins(),
                        },
                        mapUuid: mapUuid,
                    },
                },
            })) ?? [];

        for (const pb of pbs) {
            if (pb?.login && pb.login !== "") {
                this.personalBest[pb.login] = pb;
            }
        }
        return records;
    }

    async syncRecords(mapUuid: string) {
        this.records = await this.getRecords(mapUuid);
        tmc.server.emit("Plugin.Records.onSync", {
            mapUid: mapUuid,
            records: clone(this.records),
        });
    }

    async deleteRecord(login: string, data: any) {
        if (!tmc.admins.includes(login)) return;
        if (!data) {
            tmc.chat("¤error¤No data provided", login);
            return;
        }
        if (!data.mapUuid) {
            tmc.chat("¤error¤No mapUuid provided", login);
            return;
        }

        const msg = `¤info¤Deleting map record for ¤white¤${data.nickname} ¤info¤(¤white¤${data.login}¤info¤)`;
        tmc.cli(msg);
        tmc.chat(msg, login);
        try {
            await Score.destroy({
                where: {
                    [Op.and]: {
                        login: data.login,
                        mapUuid: data.mapUuid,
                    },
                },
            });

            this.records = this.records.filter((r) => r.login !== data.login);

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
            const msg = `Error deleting record: ${err.message}`;
            tmc.cli(msg);
            tmc.chat(msg, login);
        }
    }

    async getRankingsForLogin(data: any) {
        const login = data[0];
        /*
        if (tmc.game.Name === 'TmForever') {
            const ranking = await tmc.server.call('GetCurrentRankingForLogin', login);
            return ranking[0];
        }
        */
        const player = await tmc.players.getPlayer(login);
        return {
            login: login,
            NickName: player.customName ?? player.nickname,
            BestTime: data[1],
        };
    }

    async onPlayerCheckpoint(data: any) {
        const login = data[0];
        const racetime = data[1];
        const checkpointIndex = data[2];

        if (!this.playerCheckpoints[login] || checkpointIndex === 0) {
            this.playerCheckpoints[login] = [];
        }

        this.playerCheckpoints[login].push(racetime.toString());

        const nbCp = tmc.maps.currentMap?.NbCheckpoints || 1;
        if (checkpointIndex % nbCp === nbCp) {
            this.playerCheckpoints[login].push(";");
        } else {
            this.playerCheckpoints[login].push(",");
        }
    }

    async updatePB(login: string, personalBest: PersonalBest, time: number) {
        if (!personalBest) return;
        if (personalBest.mapUuid !== tmc.maps.currentMap.UId) {
            tmc.debug("PB not for this map");
            return;
        }
        if (personalBest.login !== login) {
            tmc.debug("PB not for this player");
            return;
        }

        personalBest.avgTime = personalBest.avgTime
            ? (personalBest.avgTime * (personalBest.finishCount ?? 1) + time) / ((personalBest.finishCount ?? 0) + 1)
            : time;
        personalBest.finishCount = personalBest.finishCount ? personalBest.finishCount + 1 : 1;
        if (personalBest.time && time < personalBest.time) {
            personalBest.time = time;
            personalBest.checkpoints = (this.playerCheckpoints[login] ?? []).join("");
        }
        personalBest.updatedAt = new Date();
        // save deferred until onEndRace
    }

    async onPlayerFinish(data: any) {
        const login = data[0];
        const finishTime = data[1];
        const mapUuid = tmc.maps.currentMap.UId;
        const lockKey = `${login}:${mapUuid}`;
        const limit = tmc.settings.get("records.maxRecords") || 100;

        // Per-player/map lock
        const prev = this.finishLocks[lockKey] || Promise.resolve();
        let resolveLock: (value?: any) => void = () => {};
        this.finishLocks[lockKey] = new Promise((res) => {
            resolveLock = res;
        });

        try {
            await prev;

            // Ensure checkpoints array exists and update it
            if (!this.playerCheckpoints[login]) this.playerCheckpoints[login] = [];
            this.playerCheckpoints[login].push(finishTime.toString());

            try {
                if (this.personalBest[login]) {
                    await this.updatePB(login, this.personalBest[login], finishTime);
                } else {
                    // build new personal best in-memory, defer persistence
                    const pb = PersonalBest.build({
                        login: login,
                        mapUuid: mapUuid,
                        finishCount: 1,
                        time: finishTime,
                        avgTime: finishTime,
                        checkpoints: this.playerCheckpoints[login].join(","),
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                    this.personalBest[login] = pb;
                }
            } catch (e: any) {
                tmc.cli(`¤error¤updatePB: ${e.message}`);
                return;
            }

            // If no records yet, create the first one
            if (this.records.length === 0) {
                const ranking = await this.getRankingsForLogin(data);
                if (ranking.BestTime <= 0) return;
                await Score.create({
                    login: login,
                    time: ranking.BestTime,
                    checkpoints: this.playerCheckpoints[login].join(""),
                    mapUuid: mapUuid,
                });
                const newRecord =
                    (await Score.findOne({
                        where: { [Op.and]: { login, mapUuid } },
                        include: Player,
                    })) || undefined;
                if (newRecord) {
                    newRecord.rank = 1;
                    this.records.push(newRecord);
                    tmc.server.emit("Plugin.Records.onNewRecord", {
                        record: clone(newRecord),
                        records: clone(this.records),
                    });
                }
                return;
            }

            const lastTime = this.records[this.records.length - 1].time ?? -1;
            if (lastTime === -1) return;
            if (this.records.length === limit && finishTime > lastTime) {
                return;
            }

            let record: Score | undefined = this.records.find((r) => r.login === login);
            if (!record) {
                record =
                    (await Score.findOne({
                        where: {
                            [Op.and]: {
                                login: login,
                                mapUuid: mapUuid,
                            },
                        },
                    })) ?? undefined;
                if (record) record.rank = this.records.length + 1;
            }

            let isNewRecord = false;
            let oldRecord: Score | undefined;

            // If record exists, check if this is a better time
            if (record) {
                if (typeof record.time === "number" && finishTime < record.time) {
                    oldRecord = clone(record);
                    await record.update({
                        time: finishTime,
                        checkpoints: (this.playerCheckpoints[login] ?? []).join(""),
                        updatedAt: new Date().toISOString(),
                    });
                } else {
                    // Not a better time, nothing to do
                    return;
                }
            } else {
                // New record for this player
                isNewRecord = true;
                await Score.create({
                    login,
                    time: finishTime,
                    checkpoints: (this.playerCheckpoints[login] ?? []).join(""),
                    mapUuid,
                });
                record =
                    (await Score.findOne({
                        where: { [Op.and]: { login, mapUuid } },
                        include: Player,
                    })) || undefined;
                if (record) {
                    this.records.push(record);
                }
            }

            // Sort and slice records, assign ranks
            this.records.sort((a, b) => {
                const timeA = a.time ?? Number.POSITIVE_INFINITY;
                const timeB = b.time ?? Number.POSITIVE_INFINITY;
                if (timeA === timeB) {
                    const dateA = new Date(a.updatedAt ?? 0).getTime();
                    const dateB = new Date(b.updatedAt ?? 0).getTime();
                    return dateA - dateB;
                }
                return timeA - timeB;
            });

            this.records.forEach((r, i) => {
                r.rank = i + 1;
            });
            this.records = this.records.slice(0, limit);

            // check if the record is in the records array
            if (record && (record.rank ?? 9999) <= limit) {
                // Emit appropriate event
                if (isNewRecord) {
                    tmc.server.emit("Plugin.Records.onNewRecord", {
                        record: clone(record),
                        records: clone(this.records),
                    });
                } else if (oldRecord) {
                    tmc.server.emit("Plugin.Records.onUpdateRecord", {
                        oldRecord: clone(oldRecord),
                        record: clone(record),
                        records: clone(this.records),
                    });
                }
            }
        } catch (e: any) {
            tmc.cli(`¤error¤[records.onPlayerFinish]: ${e.message}`);
        } finally {
            resolveLock();
            if (this.finishLocks[lockKey] === prev) delete this.finishLocks[lockKey];
        }
    }

    async onEndRace(_data: any) {
        try {
            const pbs = Object.values(this.personalBest);
            if (!pbs.length) return;

            const rows = pbs.map((pb) => ({
                login: pb.login,
                mapUuid: pb.mapUuid,
                finishCount: pb.finishCount,
                time: pb.time,
                avgTime: pb.avgTime,
                checkpoints: pb.checkpoints,
                createdAt: pb.createdAt,
                updatedAt: pb.updatedAt,
            }));

            const dialect = PersonalBest.sequelize?.getDialect();
            if (dialect === "sqlite") {
                for (const row of rows) {
                    await PersonalBest.destroy({
                        where: {
                            login: row.login,
                            mapUuid: row.mapUuid,
                        },
                    });
                }
            }
            await PersonalBest.bulkCreate(rows, {
                updateOnDuplicate: ["finishCount", "time", "avgTime", "checkpoints", "updatedAt"],
            });
        } catch (e: any) {
            tmc.cli(`¤error¤[records.onEndRace]: ${e.message}`);
            console.error(e);
        }
    }
}
