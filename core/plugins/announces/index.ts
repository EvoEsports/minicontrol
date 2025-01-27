import type { Player } from '@core/playermanager';
import Plugin from '../index';
import { formatTime } from '@core/utils';
import { type DediRecord } from '../tmnf/dedimania';

export default class Announces extends Plugin {
    async onLoad() {
        //   tmc.server.addListener("Trackmania.BeginMap", this.onBeginMap, this);
        tmc.server.addListener('TMC.PlayerConnect', this.onPlayerConnect, this);
        tmc.server.addListener('TMC.PlayerDisconnect', this.onPlayerDisconnect, this);
        tmc.server.addListener('Plugin.Records.onNewRecord', this.onNewRecord, this);
        tmc.server.addListener('Plugin.Records.onUpdateRecord', this.onUpdateRecord, this);
        tmc.server.addListener('Plugin.Records.onSync', this.onSyncRecord, this);
        tmc.server.addListener('Plugin.Dedimania.onNewRecord', this.onDediRecord, this);
        tmc.server.addListener('Trackmania.BeginMap', this.onBeginMap, this);
        tmc.settings.register('announce.brand', true, null, "Announces: MINIcontrol on player connect");
        tmc.settings.register('announce.playerconnect', true, null, "Announces: player connect and disconnects");
        tmc.settings.register('announce.records', true, null,  "Announces: Server records");
        tmc.settings.register('announce.dedimania', true, null, "Announces: Dedimania records");
        tmc.settings.register('announce.map', true, null, "Announces: Map info on map start");
    }

    async onStart() {
        await this.onBeginMap([tmc.maps.currentMap]);
    }

    async onUnload() {
        tmc.server.removeListener('Trackmania.BeginMap', this.onBeginMap);
        tmc.server.removeListener('TMC.PlayerConnect', this.onPlayerConnect);
        tmc.server.removeListener('TMC.PlayerDisconnect', this.onPlayerDisconnect);
        tmc.server.removeListener('Plugin.Records.onNewRecord', this.onNewRecord);
        tmc.server.removeListener('Plugin.Records.onUpdateRecord', this.onUpdateRecord);
        tmc.server.removeListener('Plugin.Records.onSync', this.onSyncRecord);
        tmc.server.removeListener('Plugin.Dedimania.onNewRecord', this.onDediRecord);
    }

    async onBeginMap(data: any) {
        const info = tmc.maps.getMap(data[0].UId) || data[0];
        const msg = `¤info¤${info.Environnement} map ¤white¤${info?.Name.replaceAll(/\$s/gi, '')}¤info¤ by ¤white¤${info.AuthorNickname ? info.AuthorNickname : info.Author}`;
        if (tmc.settings.get('announce.map')) tmc.chat(msg);
        tmc.cli(msg);
    }

    async onPlayerConnect(player: Player) {
        if (tmc.settings.get('announce.brand')) tmc.chat(`${tmc.brand} ¤info¤version ¤white¤${tmc.version}`, player.login);
        const msg = `¤white¤${player.nickname}¤info¤ from ¤white¤${player.path.replace('World|', '').replaceAll('|', ', ')} ¤info¤joins!`;
        if (tmc.settings.get('announce.playerconnect')) tmc.chat(msg);
        tmc.cli(msg);
    }

    async onPlayerDisconnect(player: Player) {
        const msg = `¤white¤${player.nickname}¤info¤ leaves!`;
        if (tmc.settings.get('announce.playerconnect')) tmc.chat(msg);
        tmc.cli(msg);
    }

    async onDediRecord(data: any) {
        if (!tmc.settings.get('announce.dedimania')) return;
        const newRecord: DediRecord = data.record;
        const oldRecord: DediRecord = data.oldRecord;

        let extrainfo = '';
        if (oldRecord && oldRecord.Rank) {
            extrainfo = `(¤gray¤$n${formatTime(newRecord.Best - oldRecord.Best).replace('0:', '')}$m¤rec¤)`;
        }
        let recipient = undefined;

        if (oldRecord && oldRecord.Best == newRecord.Best) {
            tmc.chat(`¤white¤${newRecord.NickName}¤rec¤ equalled their ¤white¤${newRecord.Rank}. ¤rec¤dedimania record ¤white¤${formatTime(newRecord.Best)}¤rec¤!`, recipient);
            return;
        }

        tmc.chat(`¤white¤${newRecord.NickName}¤rec¤ improved ¤white¤${newRecord.Rank}. ¤rec¤dedimania record ¤white¤${formatTime(newRecord.Best)}¤rec¤ ${extrainfo}!`, recipient);
    }

    async onNewRecord(data: any, _records: any[]) {
        if (!tmc.settings.get('announce.records')) return;
        const newRecord = data.record;
        const nick = newRecord.player.customNick ?? newRecord.player.nickname;
        tmc.chat(`¤white¤${nick}¤rec¤ has set a new $fff1. ¤rec¤server record ¤white¤${formatTime(newRecord.time)}¤rec¤!`);
    }

    async onUpdateRecord(data: any, _records: any[]) {
        if (!tmc.settings.get('announce.records')) return;
        const newRecord = data.record;
        const oldRecord = data.oldRecord;
        let extrainfo = '';
        const nick = newRecord.player.customNick ?? newRecord.player.nickname;

        if (oldRecord.rank) {
            extrainfo = `(¤gray¤$n${formatTime(newRecord.time - oldRecord.time).replace('0:', '')}$m¤rec¤)`;
        }
        let recipient = undefined;
        if (newRecord.rank > 15) {
            recipient = newRecord.login;
        }

        if (oldRecord.time == newRecord.time) {
            tmc.chat(`¤white¤${nick}¤rec¤ equalled their ¤white¤${newRecord.rank}. ¤rec¤server record ¤white¤${formatTime(newRecord.time)}¤rec¤!`, newRecord.login);
            return;
        }

        tmc.chat(`¤white¤${nick}¤rec¤ improved ¤white¤${newRecord.rank}. ¤rec¤server record ¤white¤${formatTime(newRecord.time)}¤rec¤ ${extrainfo}!`, recipient);
    }

    async onSyncRecord(data: any) {
        // const map = tmc.maps.getMap(data.mapUid);
        if (!tmc.settings.get('announce.records')) return;
        const records: any[] = data.records;
        if (records.length === 0) {
            return;
        }
        const nick = records[0].player.customNick ?? records[0].player.nickname;
        const msg = `¤rec¤Server record ¤white¤${nick}¤rec¤ time ¤white¤${formatTime(records[0].time)}`;
        tmc.chat(msg);
    }
}
