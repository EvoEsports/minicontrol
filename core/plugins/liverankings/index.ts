import Plugin from '@core/plugins';
import type { Player } from '@core/playermanager';
import { clone, htmlEntities, formatTime } from '@core/utils';
import RecordsWindow from '@core/plugins/records/recordsWindow';

interface LiveRecord {
    login: string;
    time: number;
    player: Player | null;
    checkpoints?: string;
    rank?: number;
}

export default class liverankings extends Plugin {
    liverankings: LiveRecord[] = [];
    currentMapUid: string = '';
    private playerCheckpoints: { [login: string]: string[] } = {};

    async onLoad() {
        tmc.server.addListener('Trackmania.BeginMap', this.onBeginMap, this);
        tmc.server.addListener('TMC.PlayerFinish', this.onPlayerFinish, this);
        tmc.server.addListener('TMC.PlayerCheckpoint', this.onPlayerCheckpoint, this);
        tmc.chatCmd.addCommand('/liverankings', this.cmdRecords.bind(this), 'Display Live Records');
    }

    async onUnload() {
        tmc.server.removeListener('Trackmania.BeginMap', this.onBeginMap.bind(this));
        tmc.server.removeListener('TMC.PlayerFinish', this.onPlayerFinish.bind(this));
        tmc.server.removeListener('TMC.PlayerCheckpoint', this.onPlayerCheckpoint.bind(this));
        tmc.chatCmd.removeCommand('/liverankings');
    }

    async onStart() {
        const menu = tmc.storage['menu'];
        if (menu) {
            menu.addItem({
                category: 'Records',
                title: 'Show: Live Records',
                action: '/liverankings'
            });
        }
        if (!tmc.maps.currentMap?.UId) return;
        this.currentMapUid = tmc.maps.currentMap.UId;
    }

    async onBeginMap(data: any) {
        const map = data[0];
        this.currentMapUid = map.UId;
        this.liverankings = [];
        tmc.server.emit('Plugin.LiveRankings.onSync', {
            records: clone(this.liverankings)
        });
    }

    async cmdRecords(login: string, _args: string[]) {
        let liverankings: any = [];
        for (const record of this.liverankings) {
            liverankings.push({
                rank: record.rank,
                nickname: htmlEntities(record.player?.nickname ?? ''),
                login: record.login,
                time: formatTime(record.time ?? 0)
            });
        }

        const window = new RecordsWindow(login, this);
        window.size = { width: 100, height: 100 };
        window.title = `Live Rankings [${this.liverankings.length}]`;
        window.setItems(liverankings);
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

    async deleteRecord(login: string, data: any) {
        if (!tmc.admins.includes(login)) return;
        const msg = `¤info¤Deleting live record for ¤white¤${data.nickname} ¤info¤(¤white¤${data.login}¤info¤)`;
        tmc.cli(msg);
        tmc.chat(msg, login);
        try {
            const recordIndex = this.liverankings.findIndex((record) => record.login === login);
            if (recordIndex !== -1) {
                this.liverankings.splice(recordIndex, 1);
            }
            let rank = 1;
            for (const score of this.liverankings) {
                score.rank = rank;
                rank += 1;
            }
            await this.cmdRecords(login, []);
        } catch (err: any) {
            const msg = `Error deleting record: ${err.message}`;
            tmc.cli(msg);
            tmc.chat(msg, login);
        }
    }

    async onPlayerCheckpoint(data: any) {
        const login = data[0];
        const raceTime = data[1];
        const checkpointIndex = data[2];

        if (!this.playerCheckpoints[login] || checkpointIndex === 0) {
            this.playerCheckpoints[login] = [];
        }

        this.playerCheckpoints[login].push(raceTime.toString());
        const nbCp = tmc.maps.currentMap?.NbCheckpoints || 1;

        if (checkpointIndex % nbCp == nbCp) {
            this.playerCheckpoints[login].push(';');
        } else {
            this.playerCheckpoints[login].push(',');
        }
    }

    async onPlayerFinish(data: any) {
        const login = data[0];
        const finishTime = data[1];
        try {
            if (!this.playerCheckpoints[login]) {
                this.playerCheckpoints[login] = [];
            }

            this.playerCheckpoints[login].push(data[1].toString());

            const player = await tmc.getPlayer(login);
            const newLiveRecord: LiveRecord = {
                login,
                time: finishTime,
                player,
                checkpoints: this.playerCheckpoints[login].join('')
            };
            const existingLiveRecordIndex = this.liverankings.findIndex((record) => record.login === login);

            if (existingLiveRecordIndex === -1) {
                this.liverankings.push({ ...newLiveRecord });
            } else {
                const existingLiveRecord = this.liverankings[existingLiveRecordIndex];
                if (newLiveRecord.time < existingLiveRecord.time) {
                    existingLiveRecord.time = newLiveRecord.time;
                    existingLiveRecord.checkpoints = this.playerCheckpoints[login].join('');
                }
            }

            this.liverankings.sort((a, b) => a.time - b.time);

            this.liverankings.forEach((record, index) => {
                record.rank = index + 1;
            });

           /* tmc.server.emit('Plugin.LiveRankings.onSync', {
                records: this.liverankings,
            }); */

        } catch (e: any) {
            tmc.cli(e);
        }
    }
}
