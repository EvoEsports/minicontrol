import Plugin from '@core/plugins';
import SectorRec from '@core/schemas/sectors.model';
import Player from '@core/schemas/players.model';
import { clone, htmlEntities, formatTime } from '@core/utils';
import { Op } from 'sequelize';
import ListWindow from '@core/ui/listwindow';
import Confirm from '@core/ui/confirm';

export interface TopRecord {
    login: string;
    time: number;
    date: string;
    nickname?: string;
}

export default class RecordsSector extends Plugin {
    static depends: string[] = ['database'];

    private sectorRecords: { [login: string]: number[] } = {};
    private lastCheckpoint: { [login: string]: number } = {};
    private topRecord: TopRecord[] = [];
    private recordCache: { [login: string]: SectorRec } = {};

    async onLoad() {
        tmc.storage['db'].addModels([SectorRec]);
    }

    async onStart() {
        tmc.server.addListener('Trackmania.BeginMap', this.onBeginMap, this);
        tmc.server.addListener('TMC.PlayerCheckpoint', this.onPlayerCheckpoint, this);
        tmc.server.addListener('TMC.PlayerConnect', this.onPlayerConnect, this);
        tmc.server.addListener('TMC.PlayerFinish', this.onPlayerFinish, this);
        tmc.addCommand('/sectors', this.cmdSecRecs.bind(this), 'Show sector records');
        tmc.addCommand('//sectors', this.cmdAdminSecRecs.bind(this), 'Sector record admin commands');
        await this.onBeginMap();
    }

    getSectorTime(login: string, checkpoint: number, racetime: number): number {
        if (checkpoint == 0) return racetime;
        const prev = this.lastCheckpoint[login];
        return racetime - prev;
    }

    async onPlayerFinish(data: any) {
        const login = data[0];
        this.lastCheckpoint[login] = Number.NaN;
    }

    async onPlayerConnect(player: any) {
        const login = player.login;
        if (this.sectorRecords[login]) return;
        try {
            if (this.sectorRecords[login] === undefined) {
                this.sectorRecords[login] = [];
            }

            const record = await SectorRec.findAll({
                where: {
                    mapUuid: tmc.maps.currentMap?.UId,
                    login: login
                }
            });

            if (!record) return;
            if (record.length > 0) {
                this.sectorRecords[login] = JSON.parse(record[0].jsonData ?? '[]');
            }
        } catch (err: any) {
            tmc.cli(`¤error¤Error loading sector records for ${login}: ` + err.message);
        }
    }

    async onBeginMap() {
        this.sectorRecords = {};
        this.topRecord = [];
        this.recordCache = {};
        this.lastCheckpoint = {};

        let filter: string[] = [];
        for (let player of tmc.players.getAll()) {
            if (player.login) {
                filter.push(player.login);
            }
        }
        filter.push('*Best Records*');

        const records = await SectorRec.findAll({
            where: {
                mapUuid: tmc.maps.currentMap?.UId,
                login: {
                    [Op.in]: filter
                }
            }
        });

        if (!records) return;

        for (let recData of records) {
            let login = recData.login;
            if (!login) continue;
            this.recordCache[login] = recData;
            if (login === '*Best Records*') continue;
            this.sectorRecords[login] = JSON.parse(recData.jsonData ?? '[]');
        }

        const bestRecord = records.find((data) => data.login === '*Best Records*');

        if (bestRecord) {
            const data = JSON.parse(bestRecord.jsonData ?? '[]');
            if (data.length === 0) return;

            const playerLogins = data.map((record: TopRecord) => record.login);
            const playerInfos = await Player.findAll({
                where: {
                    login: {
                        [Op.in]: playerLogins
                    }
                }
            });

            for (let recData of data) {
                const login = recData.login;
                if (!login) continue;
                const playerInfo = playerInfos.find((info) => info.login === login);
                let nickname = 'unknown';
                if (playerInfo && playerInfo.nickname) nickname = playerInfo.nickname;
                const formattedRecord = {
                    nickname: nickname,
                    login: recData.login,
                    time: recData.time,
                    date: recData.date
                };
                this.topRecord.push(formattedRecord);
            }
        } else {
            this.topRecord = [];
        }
    }

    async onPlayerCheckpoint(data: any) {
        const login = data[0];
        const checkpointIndex = data[2];
        const nbCp = tmc.maps.currentMap?.NbCheckpoints || 1;
        const checkpoint = checkpointIndex % nbCp;
        const sectorTime = this.getSectorTime(login, checkpoint, data[1]);

        const player = await tmc.players.getPlayer(login);

        if (this.sectorRecords[login] === undefined) {
            this.sectorRecords[login] = [];
        }

        let update = true;
        if (!this.lastCheckpoint[login] && checkpoint != 0) {
            update = false;
        }

        if (update) {
            // process pb
            if (sectorTime !== Number.NaN && sectorTime < 0) {
                this.lastCheckpoint[login] = data[1];
                return;
            }

            if (this.sectorRecords[login][checkpoint] === undefined) {
                this.sectorRecords[login][checkpoint] = sectorTime;
            }

            if (sectorTime < this.sectorRecords[login][checkpoint]) {
                const oldRecord = this.sectorRecords[login][checkpoint] || -1;
                this.sectorRecords[login][checkpoint] = sectorTime;

                try {
                    if (this.recordCache[login]) {
                        this.recordCache[login].jsonData = JSON.stringify(this.sectorRecords[login]);
                        this.recordCache[login].save();
                    } else {
                        this.recordCache[login] = await SectorRec.create({
                            mapUuid: tmc.maps.currentMap?.UId,
                            login: login,
                            jsonData: JSON.stringify(this.sectorRecords[login])
                        });
                    }
                } catch (err: any) {
                    console.log(err);
                    tmc.cli(`¤error¤Error saving sector records for login ${login}: ` + err.message);
                }

                tmc.server.emit('Plugin.secRecords.newPB', [player, checkpoint, sectorTime, oldRecord]);
            } else {
                const oldRecord = this.sectorRecords[login][checkpoint] || -1;
                tmc.server.emit('Plugin.secRecords.diffPB', [player, checkpoint, sectorTime, oldRecord]);
            }

            // process best records
            if (this.topRecord[checkpoint] === undefined) {
                this.topRecord[checkpoint] = {
                    nickname: player.nickname,
                    login: login,
                    time: sectorTime,
                    date: new Date().toISOString()
                };
            }
            if (sectorTime < this.topRecord[checkpoint]?.time) {
                const oldRecord = clone(this.topRecord[checkpoint] || {});

                this.topRecord[checkpoint] = {
                    nickname: player.nickname,
                    login: login,
                    time: sectorTime,
                    date: new Date().toISOString()
                };

                let out: any[] = [];

                for (let i in this.topRecord) {
                    const rec = this.topRecord[i];
                    out[i] = {
                        login: rec.login,
                        time: rec.time,
                        date: rec.date
                    };
                }

                try {
                    if (this.recordCache['*Best Records*']) {
                        this.recordCache['*Best Records*'].jsonData = JSON.stringify(out);
                        this.recordCache['*Best Records*'].updatedAt = new Date();
                        this.recordCache['*Best Records*'].save();
                        tmc.debug('Best sector record updated.');
                    } else {
                        this.recordCache['*Best Records*'] = await SectorRec.create({
                            mapUuid: tmc.maps.currentMap?.UId,
                            login: '*Best Records*',
                            jsonData: JSON.stringify(out)
                        });
                        tmc.debug('Best sector record created.');
                    }
                } catch (err: any) {
                    console.log(err);
                    tmc.cli('¤error¤Error saving best sector records: ' + err.message);
                }

                tmc.server.emit('Plugin.secRecords.newBest', [player, checkpoint, clone(this.topRecord[checkpoint]), oldRecord]);
            } else if (this.topRecord[checkpoint]) {
                tmc.server.emit('Plugin.secRecords.diffBest', [
                    player,
                    checkpoint,
                    {
                        nickname: player.nickname,
                        login: login,
                        time: sectorTime,
                        date: new Date().toISOString()
                    },
                    clone(this.topRecord[checkpoint])
                ]);
            }
        }
        this.lastCheckpoint[login] = data[1];
    }

    async cmdSecRecs(login: string, args: string[]) {
        const window = new ListWindow(login);
        window.title = 'Sector Records';
        window.setColumns([
            {
                key: 'cp',
                title: 'CP',
                width: 5
            },
            {
                key: 'nickname',
                title: 'Nickname',
                width: 40
            },
            {
                key: 'time',
                title: 'Time',
                width: 20
            },
            {
                key: 'diff',
                title: 'Difference',
                width: 20
            },
            {
                key: 'myTime',
                title: 'My Time',
                width: 20
            },
            {
                key: 'date',
                title: 'Date',
                width: 50
            }
        ]);

        let items: any = [];
        for (let i in this.topRecord) {
            const rec = this.topRecord[i];
            if (!rec) {
                items[i] = {
                    cp: Number.parseInt(i) + 1,
                    nickname: '-',
                    time: '-',
                    diff: '-',
                    date: '-'
                };
                continue;
            }

            let diff = '';
            let color = '$f00';
            let myTime = '-';
            if (this.sectorRecords[login] && this.sectorRecords[login][i]) {
                const playerTime = this.sectorRecords[login][i];
                myTime = formatTime(playerTime);
                diff = formatTime(playerTime - rec.time);
                if (playerTime < rec.time) {
                    color = '$00f';
                } else {
                    diff = '+' + diff;
                }

                if (playerTime === rec.time) {
                    diff = 'PB';
                    color = '$0f0';
                }
            }

            let formattedDate = new Date(rec.date).toLocaleString('en-GB');

            items[i] = {
                cp: Number.parseInt(i) + 1,
                nickname: htmlEntities(rec.nickname ?? '-'),
                time: formatTime(rec.time),
                myTime: myTime,
                diff: color + diff,
                date: formattedDate
            };
        }

        window.setItems(items);
        await window.display();
    }

    // admin command
    async cmdAdminSecRecs(login: string, args: string[]) {
        if (args.length < 1) {
            tmc.chat('¤info¤Usage: ¤cmd¤//sectors delmap, delall', login);
            return;
        }

        if (args[0] === 'delmap') {
            const confirm = new Confirm(
                login,
                'Delete all sector records for this map (no undo)?',
                async () => {
                    await SectorRec.destroy({
                        where: {
                            mapUuid: tmc.maps.currentMap?.UId
                        }
                    });
                    tmc.chat('¤info¤Sector records deleted for this map', login);
                    await this.onBeginMap();
                },
                []
            );
            await confirm.display();
            return;
        }

        if (args[0] === 'delall') {
            const confirm = new Confirm(
                login,
                'Delete all sector records (no undo)?',
                async () => {
                    const rec = await SectorRec.truncate();
                    tmc.chat('¤info¤All sector records deleted.', login);
                    await this.onBeginMap();
                },
                []
            );
            await confirm.display();
            return;
        }

        tmc.chat('¤info¤Usage: ¤cmd¤//sectors delmap, delall', login);
    }
}
