import Plugin from '@core/plugins';
import Score from '@core/schemas/scores.model';
import Player from '@core/schemas/players.model';
import { clone, htmlEntities, formatTime } from '@core/utils';
import RecordsWindow from './recordsWindow';
import { Op } from 'sequelize';
import Menu from '../menu/menu';

export default class Records extends Plugin {
    static depends: string[] = ['database'];
    records: Score[] = [];
    currentMapUid: string = '';
    private playerCheckpoints: { [login: string]: string[] } = {};

    async onLoad() {
        tmc.storage['db'].addModels([Score]);
        tmc.server.addListener('Trackmania.BeginMap', this.onBeginMap, this);
        tmc.server.addListener('TMC.PlayerFinish', this.onPlayerFinish, this);
        tmc.server.addListener('TMC.PlayerCheckpoint', this.onPlayerCheckpoint, this);
        tmc.chatCmd.addCommand('/records', this.cmdRecords.bind(this), 'Display Records');
        tmc.settings.register('records.maxRecords', 100, this.settingMaxRecords.bind(this), 'LocalRecords: Maximum number of records');
        Menu.getInstance().addItem({
            category: 'Records',
            title: 'Local Records',
            action: '/records'
        });
    }

    async onUnload() {
        tmc.server.removeListener('Trackmania.BeginMap', this.onBeginMap);
        tmc.server.removeListener('TMC.PlayerFinish', this.onPlayerFinish);
        tmc.server.removeListener('TMC.PlayerCheckpoint', this.onPlayerCheckpoint);
        tmc.chatCmd.removeCommand('/records');
    }

    async onStart() {
        const menu = tmc.storage['menu'];
        if (menu) {
            menu.addItem({
                category: 'Records',
                title: 'Show: Server Records',
                action: '/records'
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

    async settingMaxRecords(value: any) {
        await this.syncRecords(this.currentMapUid);
    }

    async cmdRecords(login: string, _args: string[]) {
        let records: any = [];
        for (const record of this.records) {
            records.push({
                rank: record.rank,
                nickname: htmlEntities(record?.player?.customNick ?? record?.player?.nickname ?? ''),
                login: record.login,
                time: formatTime(record.time ?? 0)
            });
        }
        const window = new RecordsWindow(login, this);
        window.size = { width: 100, height: 100 };
        window.title = `Server Records [${this.records.length}]`;
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
        await window.display();
    }

    async syncRecords(mapUuid: string) {
        const scores = await Score.findAll({
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

        this.records = [];
        let rank = 1;
        for (const score of scores) {
            score.rank = rank;
            this.records.push(score);
            rank += 1;
        }

        tmc.server.emit('Plugin.Records.onSync', {
            mapUid: mapUuid,
            records: clone(this.records)
        });
    }

    async deleteRecord(login: string, data: any) {
        if (!tmc.admins.includes(login)) return;
        const msg = `¤info¤Deleting map record for ¤white¤${data.nickname} ¤info¤(¤white¤${data.login}¤info¤)`;
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
        if (tmc.game.Name === 'TmForever') {
            const ranking = await tmc.server.call('GetCurrentRankingForLogin', login);
            return ranking[0];
        }

        return {
            login: login,
            NickName: (await tmc.players.getPlayer(login)).nickname,
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
        if (checkpointIndex % nbCp == 0) {
            this.playerCheckpoints[login].push(';');
        } else {
            this.playerCheckpoints[login].push(',');
        }
    }

    async onPlayerFinish(data: any) {
        const login = data[0];
        const limit = tmc.settings.get('records.maxRecords') || 100;

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
                    mapUuid: this.currentMapUid
                });
                const newRecord = await Score.findOne({
                    where: {
                        [Op.and]: {
                            login: login,
                            mapUuid: this.currentMapUid
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
            const record = this.records.find((r) => r.login === login);
            let oldRecord: Score = clone(record);

            if (record) {
                if (typeof record.time === 'number') {
                    if (ranking.BestTime >= record.time) return;
                    if (time < record.time) {
                        record.update({
                            time: ranking.BestTime,
                            checkpoints: this.playerCheckpoints[login].join('')
                        });
                        this.records[this.records.findIndex((r) => r.login === login)] = record;
                    }
                }
            } else {
                await Score.create({
                    mapUuid: this.currentMapUid,
                    login: login,
                    time: ranking.BestTime,
                    checkpoints: this.playerCheckpoints[login].join('')
                });
                const newRecord = await Score.findOne({
                    where: {
                        [Op.and]: {
                            login: login,
                            mapUuid: this.currentMapUid
                        }
                    },
                    include: Player
                });
                if (newRecord) {
                    this.records.push(newRecord);
                }
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

            let outRecord: Score = {} as Score;
            for (let i = 0; i < this.records.length; i++) {
                this.records[i].rank = i + 1;

                if (this.records[i].login == login) {
                    outRecord = this.records[i];
                }
            }

            this.records = this.records.slice(0, limit);

            if (!oldRecord) {
                tmc.server.emit('Plugin.Records.onNewRecord', {
                    record: clone(outRecord),
                    records: clone(this.records)
                });
            } else {
                tmc.server.emit('Plugin.Records.onUpdateRecord', {
                    oldRecord: oldRecord || {},
                    record: clone(outRecord),
                    records: clone(this.records)
                });
            }
        } catch (e: any) {
            tmc.cli(e);
        }
    }
}
