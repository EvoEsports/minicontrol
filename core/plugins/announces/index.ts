import Plugin from "core/plugins";
import type { Record } from "core/plugins/records";
import { formatTime } from 'core/utils';

export default class Announces extends Plugin {
    async onLoad() {
        //   tmc.server.addListener("Trackmania.BeginMap", this.onBeginMap, this);
        tmc.server.addListener("TMC.PlayerConnect", this.onPlayerConnect, this);
        tmc.server.addListener("TMC.PlayerDisconnect", this.onPlayerDisconnect, this);
        tmc.server.addListener("Plugin.Records.onNewRecord", this.onNewRecord, this);
        tmc.server.addListener("Plugin.Records.onUpdateRecord", this.onUpdateRecord, this);
        tmc.server.addListener("Plugin.Records.onSync", this.onSyncRecord, this);
    }

    async onUnload() {
        // tmc.server.removeListener("Trackmania.BeginMap", this.onBeginMap.bind(this));
        tmc.server.removeListener("TMC.PlayerConnect", this.onPlayerConnect);
        tmc.server.removeListener("TMC.PlayerDisconnect", this.onPlayerDisconnect);
        tmc.server.removeListener("Plugin.Records.onNewRecord", this.onNewRecord);
        tmc.server.removeListener("Plugin.Records.onUpdateRecord", this.onUpdateRecord);
        tmc.server.removeListener("Plugin.Records.onSync", this.onSyncRecord);
    }

    async onBeginMap(data: any) {
        const info = data[0];
        const msg = `¤info¤Now Playing: $fff${info.Name}¤info¤ by $fff${info.AuthorNickname ? info.AuthorNickname : info.Author}`;
        tmc.chat(msg);
        tmc.cli(msg);
    }

    async onPlayerConnect(player: any) {       
        const msg = `$fff${player.nickname}¤info¤ has joined!`;
        tmc.chat(msg);
        tmc.cli(msg);
    }

    async onPlayerDisconnect(player: any) {        
        const msg = `$fff${player.nickname}¤info¤ has left!`;
        tmc.chat(msg);
        tmc.cli(msg);
    }

    async onNewRecord(data: any, records: Record[]) {
        const newRecord = data.record;
        tmc.chat(`$fff${newRecord.nickname}¤info¤ has set a new $fff1. ¤info¤server record ¤white¤${formatTime(newRecord.time)}¤info¤!`);
    }

    async onUpdateRecord(data: any, records: Record[]) {
        const newRecord = data.record;
        const oldRecord = data.oldRecord;
        let extrainfo = "";
        if (oldRecord.rank) {
            extrainfo = `(¤gray¤$n${formatTime(newRecord.time - oldRecord.time).replace("0:", "")}$m¤info¤)`;
        }
        let recipient = undefined;
        if (newRecord.rank > 15) {
            recipient = newRecord.login;
        }
        tmc.chat(`$fff${newRecord.nickname}¤info¤ improved $fff${newRecord.rank}. ¤info¤server record $fff${formatTime(newRecord.time)}¤info¤ ${extrainfo}!`, recipient);
    }

    async onSyncRecord(data: any) {
        const mapUid = data.mapUid;
        const records: Record[] = data.records;
        if (records.length === 0) {
            tmc.chat(`No server records for this map yet!`);
            return;
        }
        const msg = `$fff${records[0].nickname}¤info¤ holds the $fff1. ¤info¤server record ¤white¤${formatTime(records[0].time)}¤info¤!`;
        tmc.chat(msg);
    }
}

