import Plugin from '@core/plugins';
import { clone, htmlEntities, formatTime } from '@core/utils';
import type { TopRecord } from '@core/plugins/secrecords';
import type { Player } from '@core/playermanager';

export default class SecRecordsWidget extends Plugin {
    static depends: string[] = ['secrecords'];

    async onLoad() {
        tmc.server.addListener('Plugin.secRecords.newBest', this.newBest, this);
        tmc.server.addListener('Plugin.secRecords.diffBest', this.diffBest, this);
        // tmc.server.addListener('Plugin.secRecords.newPB', this.newPB, this);
        // tmc.server.addListener('Plugin.secRecords.diffPB', this.diffPB, this);
    }

    async newBest(data: any) {
        this.onBest(data, true);
    }
    async diffBest(data: any) {
        this.onBest(data, false);
    }
    async newPB(data: any) {
        this.onPB(data, true);
    }
    async diffPB(data: any) {
        this.onPB(data, false);
    }

    async onBest(data: any, isNew: boolean) {
        const player: Player = data[0];
        const checkpoint: number = data[1];
        const newRecord: TopRecord = data[2];
        const oldRecord: TopRecord = data[3];
        let time = newRecord.time - oldRecord.time;
        let color = 'f00';
        let outTime = formatTime(time);

        if (time < 0) color = '00f';
        let prefix = '';
        if (time > 0) prefix = '+';

        if (isNew) color = '00f';
        if (oldRecord.time == newRecord.time) {
            prefix = '';
            color = '0f0';
        }
        let xml = '';

        if (tmc.game.Name == 'TmForever') {
            xml = `<?xml version="1.0" encoding="UTF-8"?><manialinks>
                <manialink id="-3" version="3">
                    <frame pos="-25 48" z-index="0">
                        <label pos="3 -14" z-index="1" text="$fff$s${checkpoint + 1}/${tmc.maps.currentMap?.NbCheckpoints || 1})" textsize="2" halign="right" valign="center2" />
                        <label pos="13 -20" size="50 5" z-index="1" text="$s$${color}${prefix}${outTime}" halign="left" valign="center2" scale="0.4" textsize="1" style="TextRaceChrono"/>
                    </frame>
                </manialink>
            </manialinks>
            `;
        } else {
            xml = `<?xml version="1.0" encoding="UTF-8"?>
            <manialinks>
                <manialink id="-3" version="3">
                    <frame pos="0 48" z-index="0">
                        <label pos="-11 -17.25" z-index="1" text="$fff$s${checkpoint + 1}/${
                tmc.maps.currentMap?.NbCheckpoints || 1
            })" textsize="2" halign="right" valign="center2" />
                        <quad pos="-10 -17.25" size="9 7" z-index="0" bgcolor="0009" halign="right" valign="center2" />
                        <label pos="-9 -24" size="17 6.5" z-index="1" text="$o${prefix}${outTime}" halign="left" valign="center2" textsize="1" />
                        <quad pos="-10 -24" size="18 6.5" z-index="0" bgcolor="${color}6" halign="left" valign="center2" textsize="1" />
                    </frame>
                </manialink>
            </manialinks>`;
        }

        tmc.server.send('SendDisplayManialinkPageToLogin', player.login, tmc.ui.convert(xml), 2000, false);
    }

    async onPB(data: any, isNew: boolean) {
        const player: Player = data[0];
        const checkpoint: number = data[1];
        const newTime: number = data[2];
        const oldTime: number = data[3];

        let time = newTime - oldTime;
        let color = '$f00';
        if (oldTime == -1) {
            time = newTime;
            color = '$999';
            if (isNew) color = '$0f0';
        }

        if (time < 0) color = '$00f';
        if (isNew) color = '$0f0';

        tmc.cli(`¤info¤${player.login}$z$s ${color + formatTime(time)}`);
    }
}
