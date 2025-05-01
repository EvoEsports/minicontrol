import Plugin from '@core/plugins';
import Score from '@core/schemas/scores.model';
import Player from '@core/schemas/players.model';
import PersonalBest from '@core/schemas/personalBest.model';
import { clone, htmlEntities, formatTime } from '@core/utils';
import RecordsWindow from './recordsWindow';
import { Op } from 'sequelize';
import Menu from '../menu/menu';

export default class Records extends Plugin {
    static depends: string[] = ['database'];
    records: Score[] = [];
    private playerCheckpoints: { [login: string]: string[] } = {};
    personalBest: { [login: string]: PersonalBest } = {};

    async onLoad() {
        tmc.storage['db'].addModels([Score, PersonalBest]);
        tmc.chatCmd.addCommand('/records', this.cmdRecords.bind(this), 'Display Records');
        tmc.settings.register('records.maxRecords', 100, this.settingMaxRecords.bind(this), 'LocalRecords: Maximum number of records');
    }

    async onUnload() {
        tmc.server.removeListener('Trackmania.BeginMap', this.onBeginMap);
        tmc.server.removeListener('TMC.PlayerFinish', this.onPlayerFinish);
        tmc.server.removeListener('TMC.PlayerCheckpoint', this.onPlayerCheckpoint);
        tmc.chatCmd.removeCommand('/records');
    }

    async onStart() {
        Menu.getInstance().addItem({
            category: 'Records',
            title: 'Local Records',
            action: '/records'
        });
        await this.syncRecords(tmc.maps.currentMap.UId);

        tmc.server.addListener('Trackmania.BeginMap', this.onBeginMap, this);
        tmc.server.addListener('TMC.PlayerFinish', this.onPlayerFinish, this);
        tmc.server.addListener('TMC.PlayerCheckpoint', this.onPlayerCheckpoint, this);
        tmc.server.addListener('TMC.PlayerConnect', this.onPlayerConnect, this);
    }

    async onBeginMap(data: any) {
        const map = data[0];
        tmc.maps.currentMap.UId = map.UId;
        this.personalBest = {};
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
                        mapUuid: tmc.maps.currentMap.UId
                    }
                }
            });
            if (personalBest) {
                this.personalBest[login] = personalBest;
            }
        } catch (e: any) {
            tmc.cli('¤error¤Error fetching personal best: ' + e.message);
        }
        try {
            const newRecord = await Score.findOne({
                where: {
                    [Op.and]: {
                        login: login,
                        mapUuid: tmc.maps.currentMap.UId
                    }
                },
                include: Player
            });
            if (!newRecord) return;
            // update record if present in records
            const record = this.records.find((r) => r.login === login);
            if (record) {
                record.time = newRecord.time;
                record.checkpoints = newRecord.checkpoints;
                record.updatedAt = newRecord.updatedAt;
            } else {
                this.records.push(newRecord);
            }
            this.records.sort((a, b) => {
                const timeA = a.time ?? Infinity;
                const timeB = b.time ?? Infinity;

                if (timeA === timeB) {
                    const strA = a.updatedAt.toString();
                    const strB = b.updatedAt.toString();
                    return strA.localeCompare(strB);
                }

                return timeA - timeB;
            });
            for (let i = 0; i < this.records.length; i++) {
                this.records[i].rank = i + 1;
            }

            const limit = tmc.settings.get('records.maxRecords') || 100;
            this.records = this.records.slice(0, limit);
            tmc.server.emit('Plugin.Records.onRefresh', {
                records: clone(this.records)
            });
        } catch (e: any) {
            tmc.cli('¤error¤Error fetching new record: ' + e.message);
        }
    }

    async settingMaxRecords(value: any) {
        await this.syncRecords(tmc.maps.currentMap.UId);
    }

    async cmdRecords(login: string, args: string[]) {
        let records: any = [];
        let mapUuid = tmc.maps.currentMap.UId;

        if (args.length > 0) {
            mapUuid = args[0].trim() || tmc.maps.currentMap.UId;
        }

        for (const record of await this.getRecords(mapUuid)) {
            records.push({
                rank: record.rank,
                nickname: htmlEntities(record?.player?.customNick ?? record?.player?.nickname ?? ''),
                login: record.login,
                time: formatTime(record.time ?? 0),
                mapUuid: mapUuid
            });
        }
        const map = tmc.maps.getMap(mapUuid) ?? tmc.maps.currentMap;
        const window = new RecordsWindow(login, this);
        window.size = { width: 100, height: 100 };
        window.title = `Server Records for ${htmlEntities(map.Name)}$z$s [${this.records.length}]`;
        window.setItems(records);
        window.setColumns([
            { key: 'rank', title: 'Rank', width: 10 },
            { key: 'nickname', title: 'Nickname', width: 50 },
            { key: 'time', title: 'Time', width: 20 }
        ]);

        window.setActions(['View']);

        if (tmc.admins.includes(login)) {
            window.size.width = 115;
            window.setActions(['View', 'Delete']);
        }
        window.display();
    }

    async getRecords(mapUuid: string) {
        let scores: Score[] = [];
        try {
            scores = await Score.findAll({
                where: {
                    mapUuid: mapUuid
                },
                order: [
                    ['time', 'ASC'],
                    ['updatedAt', 'ASC']
                ],
                limit: tmc.settings.get('records.maxRecords'),
                include: [Player]
            });
        } catch (err: any) {
            tmc.cli('Error fetching records: ' + err.message);
            return [];
        }

        let records: Score[] = [];
        let rank = 1;
        for (const score of scores) {
            score.rank = rank;
            records.push(score);
            rank += 1;
        }
        return records;
    }

    async syncRecords(mapUuid: string) {
        this.records = await this.getRecords(mapUuid);
        tmc.server.emit('Plugin.Records.onSync', {
            mapUid: mapUuid,
            records: clone(this.records)
        });
    }

    async deleteRecord(login: string, data: any) {
        if (!tmc.admins.includes(login)) return;
        if (!data) {
            tmc.chat('¤error¤No data provided', login);
            return;
        }
        if (!data.mapUuid) {
            tmc.chat('¤error¤No mapUuid provided', login);
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
                        mapUuid: data.mapUuid
                    }
                }
            });

            this.records = this.records.filter((r) => r.login !== data.login);

            let rank = 1;
            for (const score of this.records) {
                score.rank = rank;
                rank += 1;
            }

            tmc.server.emit('Plugin.Records.onRefresh', {
                records: clone(this.records)
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
            BestTime: data[1]
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
        if (checkpointIndex % nbCp == nbCp) {
            this.playerCheckpoints[login].push(';');
        } else {
            this.playerCheckpoints[login].push(',');
        }
    }

    async updatePB(login: string, personalBest: PersonalBest, time: number) {
        if (!personalBest) return;
        if (personalBest.mapUuid !== tmc.maps.currentMap.UId) {
            tmc.debug('PB not for this map');
            return;
        }
        if (personalBest.login !== login) {
            tmc.debug('PB not for this player');
            return;
        }

        personalBest.avgTime = personalBest.avgTime ? (personalBest.avgTime * (personalBest.finishCount ?? 1) + time) / ((personalBest.finishCount ?? 0) + 1) : time;
        personalBest.finishCount = personalBest.finishCount ? personalBest.finishCount + 1 : 1;
        if (personalBest.time && time < personalBest.time) {
            personalBest.time = time;
            personalBest.checkpoints = (this.playerCheckpoints[login] ?? []).join('');
        }
        personalBest.updatedAt = new Date().toISOString();
        personalBest.save();
    }

    async onPlayerFinish(data: any) {
        const login = data[0];

        const limit = tmc.settings.get('records.maxRecords') || 100;
        try {
            if (!this.personalBest[login]) {
                const personalBest = await PersonalBest.findOne({
                    where: {
                        [Op.and]: {
                            login: login,
                            mapUuid: tmc.maps.currentMap.UId
                        }
                    }
                });
                if (personalBest) {
                    this.updatePB(login, personalBest, data[1]);
                } else {
                    this.personalBest[login] = await PersonalBest.create({
                        login: login,
                        mapUuid: tmc.maps.currentMap.UId,
                        finishCount: 1,
                        time: data[1],
                        avgTime: data[1],
                        checkpoints: this.playerCheckpoints[login].join(''),
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                }
            } else {
                this.updatePB(login, this.personalBest[login], data[1]);
            }
        } catch (e: any) {
            tmc.cli(`¤error¤updatePB: ${e.message}`);
        }

        try {
            if (!this.playerCheckpoints[login]) {
                this.playerCheckpoints[login] = [];
            }

            this.playerCheckpoints[login].push(data[1].toString());

            if (this.records.length == 0) {
                let ranking = await this.getRankingsForLogin(data);
                if (ranking.BestTime <= 0) return;
                await Score.create({
                    login: login,
                    time: ranking.BestTime,
                    checkpoints: this.playerCheckpoints[login].join(''),
                    mapUuid: tmc.maps.currentMap.UId
                });
                const newRecord = await Score.findOne({
                    where: {
                        [Op.and]: {
                            login: login,
                            mapUuid: tmc.maps.currentMap.UId
                        }
                    },
                    include: Player
                });
                if (newRecord) {
                    newRecord.rank = 1;

                    this.records.push(newRecord);
                    tmc.server.emit('Plugin.Records.onNewRecord', {
                        record: newRecord,
                        records: clone(this.records)
                    });
                }
                return;
            }

            const lastIndex = this.records.length > limit ? limit : this.records.length;
            const lastRecord = this.records[lastIndex - 1];

            let ranking = await this.getRankingsForLogin(data);
            if (ranking.BestTime <= 0) return;

            if (lastIndex >= limit && lastRecord && typeof lastRecord.time === 'number' && ranking.BestTime >= lastRecord.time) return;
            const time = ranking.BestTime;
            let record = this.records.find((r) => r.login === login);
            let oldRecord: Score = clone(record);

            if (record) {
                if (typeof record.time === 'number') {
                    if (ranking.BestTime >= record.time) return;
                    if (time < record.time) {
                        record.set({
                            time: ranking.BestTime,
                            checkpoints: this.playerCheckpoints[login].join('')
                        });
                        this.records[this.records.findIndex((r) => r.login === login)] = record;
                    }
                }
            } else {
                record = await Score.build(
                    {
                        mapUuid: tmc.maps.currentMap.UId,
                        login: login,
                        time: ranking.BestTime,
                        checkpoints: this.playerCheckpoints[login].join('')
                    },
                    {
                        include: Player
                    }
                );
            }
            this.records.sort((a, b) => {
                const timeA = a.time ?? Infinity;
                const timeB = b.time ?? Infinity;

                if (timeA === timeB) {
                    const strA = a.updatedAt.toString();
                    const strB = b.updatedAt.toString();
                    return strA.localeCompare(strB);
                }

                return timeA - timeB;
            });

            let inRange = false;
            this.records = this.records.slice(0, limit);
            if (this.records.includes(record)) {
                inRange = true;
                await record.save();
            }

            if (!inRange) {
                return;
            }
            let outRecord: Score = {} as Score;
            for (let i = 0; i < this.records.length; i++) {
                this.records[i].rank = i + 1;
                if (this.records[i].login == login) {
                    outRecord = this.records[i];
                }
            }

            if (!oldRecord) {
                tmc.server.emit('Plugin.Records.onNewRecord', {
                    record: clone(outRecord),
                    records: clone(this.records)
                });
            } else {
                tmc.server.emit('Plugin.Records.onUpdateRecord', {
                    oldRecord: oldRecord ?? {},
                    record: clone(outRecord),
                    records: clone(this.records)
                });
            }
        } catch (e: any) {
            tmc.cli(`¤error¤Update Record for login: ${login}: ${e.message}`);
        }
    }
}
