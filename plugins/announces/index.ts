import Plugin from "core/plugins";
import type { Record } from "plugins/records";
import { formatTime } from 'core/utils';

export default class Announces extends Plugin {
    async onLoad() {
        //   tmc.server.on("Trackmania.BeginMap", this.onBeginMap.bind(this));
        tmc.server.on("Trackmania.PlayerConnect", this.onPlayerConnect.bind(this));
        tmc.server.on("Trackmania.PlayerDisconnect", this.onPlayerDisconnect.bind(this));
        tmc.server.on("Plugin.Records.onNewRecord", this.onNewRecord.bind(this));
        tmc.server.on("Plugin.Records.onUpdateRecord", this.onUpdateRecord.bind(this));
        tmc.server.on("Plugin.Records.onSync", this.onSyncRecord.bind(this));
    }

    async onUnload() {
        // tmc.server.removeListener("Trackmania.BeginMap", this.onBeginMap.bind(this));
        tmc.server.removeListener("Trackmania.PlayerConnect", this.onPlayerConnect.bind(this));
        tmc.server.removeListener("Trackmania.PlayerDisconnect", this.onPlayerDisconnect.bind(this));
        tmc.server.removeListener("Plugin.Records.onNewRecord", this.onNewRecord.bind(this));
        tmc.server.removeListener("Plugin.Records.onUpdateRecord", this.onUpdateRecord.bind(this));
        tmc.server.removeListener("Plugin.Records.onSync", this.onSyncRecord.bind(this));
    }

    async onBeginMap(data: any) {
        const info = data[0];
        const msg = `¤info¤Now Playing: $fff${info.Name}¤info¤ by $fff${info.AuthorNickname ? info.AuthorNickname : info.Author}`;
        tmc.chat(msg);
        tmc.cli(msg);
    }

    async onPlayerConnect(data: any) {
        const login = data[0];
        const player = await tmc.getPlayer(login);
        const msg = `$fff${player.nickname}¤info¤ has joined!`;
        tmc.chat(msg);
        tmc.cli(msg);
    }

    async onPlayerDisconnect(data: any) {
        const login = data[0];
        const player = await tmc.getPlayer(login);
        const msg = `$fff${player.nickname}¤info¤ has left!`;
        tmc.chat(msg);
        tmc.cli(msg);
    }

    async onNewRecord(data: any, records: Record[]) {
        const newRecord = data.record;
        tmc.chat(`$fff${newRecord.nickname}¤info¤ has set a new $fff#1 ¤info¤server record of ¤white¤${formatTime(newRecord.time)}¤info¤!`);
    }

    async onUpdateRecord(data: any, records: Record[]) {
        const newRecord = data.record;
        const oldRecord = data.oldRecord;
        let recipient = undefined;
        if (newRecord.rank > 15) {
            recipient = newRecord.login;
        }
        tmc.chat(`$fff${newRecord.nickname}¤info¤ has improved the $fff#${newRecord.rank} ¤info¤server record to $fff${formatTime(newRecord.time)}¤info¤ (${oldRecord.rank} ${formatTime(oldRecord.time)})!`, recipient);
    }

    async onSyncRecord(data: any) {
        const mapUid = data.mapUid;
        const records: Record[] = data.records;
        if (records.length === 0) {
            tmc.chat(`No server records for this map yet!`);
            return;
        }
        const msg = `$fff${records[0].nickname}¤info¤ holds the $fff#1 ¤info¤server record of ¤white¤${formatTime(records[0].time)}¤info¤!`;
        tmc.chat(msg);
    }
}

