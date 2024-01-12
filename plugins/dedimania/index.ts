import { Player } from 'core/playermanager';
import Api from './api';
import * as fs from 'fs';
import { colors, escape } from 'core/utils';
import tm from 'tm-essentials';
import ListWindow from 'core/ui/listwindow';
import Plugin from 'core/plugins';
import Widget from 'core/ui/widget';

export interface DediRecord {
    Login: string;
    NickName: string;
    Best: number;
    Rank: number;
    Checks: number[];
    Vote: number;
}

export default class Dedimania extends Plugin {
    depends: string[] = ["game:TmForever"];
    enabled: boolean = false;
    maxRank: number = 30;
    api: Api = new Api();
    serverLogin: string = "";
    sessionId: string = "";
    server: any = {};
    serverInfo: any = {};
    records: any = [];
    widget: Widget | null = null;
    sendRecords: boolean = false;
    intervalId: NodeJS.Timeout | null = null;

    async onLoad() {
        this.widget = new Widget("plugins/dedimania/widget.twig");
        this.widget.title = "Dedimania";
        this.widget.pos = { x: -160, y: 40 };
        this.widget.size = { width: 45, height: 45 };
        this.widget.setOpenAction(this.widgetClick.bind(this));

        tmc.debug("¤info¤Dedimania: TmForever detected, enabling plugin.");
        tmc.addCommand("/dedirecords", this.cmdDediRecords.bind(this), "Show dedimania records");

        this.serverInfo = await tmc.server.call("GetMainServerPlayerInfo");
        this.serverLogin = this.serverInfo.Login;
        const pass = process.env.DEDIMANIA_PASS || "";
        if (pass == "") {
            this.enabled = false;
            return;
        }
        
        try {
            const res = await this.authenticate();
            if (res == true) {
                tmc.cli("¤info¤Dedimania: Authenticated.");
                await this.updatePlayers();
                this.intervalId = setInterval(async () => { await this.updatePlayers(); }, 180 * 1000);
                this.getRecords(tmc.maps.currentMap);
                tmc.server.addListener("Trackmania.BeginMap", this.onBeginMap, this);
                tmc.server.addListener("Trackmania.EndMap", this.onEndMap, this);
            } else {
                tmc.cli("¤error¤Dedimania: Failed to authenticate.");
            }
        } catch (e: any) {
            tmc.cli(e);
        }
    }

    async onUnload() {
        clearInterval(this.intervalId!);
        tmc.removeCommand("/dedirecords");
        this.widget?.destroy();
        this.widget = null;
        tmc.server.removeListener("Trackmania.BeginMap", this.onBeginMap.bind(this));
        tmc.server.removeListener("Trackmania.EndMap", this.onEndMap.bind(this));
    }

    async cmdDediRecords(login: string, args: string[]) {
        let records = [];
        for (let record of this.records) {
            records.push(
                {
                    rank: record.Rank,
                    nickname: escape(record.NickName),
                    time: "$o" + tm.Time.fromMilliseconds(record.Best).toTmString().replace(/^0:/, ""),
                });
        }
        const window = new ListWindow(login);
        window.size = { width: 90, height: 100 };
        window.title = "Dedimania records";
        window.setItems(records);
        window.setColumns([
            { key: "rank", title: "Rank", width: 10 },
            { key: "nickname", title: "Nickname", width: 50 },
            { key: "time", title: "Time", width: 20 },
        ]);
        await window.display();
    }
    /**
     * Update the players on dedimania.
     */
    async updatePlayers() {
        if (!this.enabled) return;
        const serverGameMode = await tmc.server.call("GetGameMode");
        const serverInfo = await tmc.server.call("GetServerOptions", 0);
        const res = await this.api.call('dedimania.UpdateServerPlayers',
            "TMF",
            serverGameMode,
            {
                SrvName: serverInfo.Name,
                Comment: serverInfo.Comment,
                Private: serverInfo.Password != "",
                SrvIP: "127.0.0.1",
                SrvPort: "2350",
                XmlRpcPort: "5000",
                NumPlayers: tmc.players.get().filter((pl: Player) => !pl.isSpectator).length,
                MaxPlayers: serverInfo.CurrentMaxPlayers,
                NumSpectators: tmc.players.get().filter((pl: Player) => pl.isSpectator).length,
                MaxSpectators: serverInfo.CurrentMaxSpectators,
                LadderMode: serverInfo.LadderMode,
                NextFiveUID: "",
            },
            this.getDedimaniaPlayers()
        );
        tmc.debug("¤info¤Dedimania: Updated players.");
    }

    /**
     * authenticate to dedimania
     * @returns {boolean}
     */
    async authenticate() {
        this.server = await tmc.server.call("GetDetailedPlayerInfo", this.serverInfo.Login);
        const packmask = await tmc.server.call("GetServerPackMask");
        const pass = process.env.DEDIMANIA_PASS || "";

        const res: any = await this.api.call("dedimania.Authenticate", {
            Game: 'TMF',
            Login: this.serverLogin,
            Password: pass.toString(),
            Tool: "MINIcontrol",
            Version: tmc.version,
            Nation: this.server.Path,
            Packmask: packmask,
            ServerVersion: tmc.game.Version,
            ServerBuild: tmc.game.Build
        }
        );

        this.enabled = res ?? false;
        return this.enabled;
    }

    async onEndMap(data: any) {
        if (!this.enabled) return;
        const serverGameMode = await tmc.server.call("GetGameMode");
        const scores: any = data[0];
        const map: any = data[1];
        try {
            const res = await this.api.call("dedimania.ChallengeRaceTimes",
                map.UId,
                map.Name,
                map.Environnement,
                map.Author,
                "TMF",
                serverGameMode,
                map.NbCheckpoints,
                this.maxRank,
                this.getDedimaniaScores(scores)
            );
            tmc.debug("¤info¤Dedimania: Sent scores.");
        } catch (e: any) {
            tmc.cli(e);
        }
    }

    getDedimaniaScores(scores: any) {
        const out = [];
        for (let score of scores) {
            out.push({
                Login: score.Login,
                Best: score.BestTime,
                Checks: [score.BestCheckpoints].join(",")
            });
        }
        return out;
    }


    async getRecords(map: any) {
        if (!this.enabled) return;
        if (!map) return;
        // Rounds (0), TimeAttack (1), Team (2), Laps (3), Stunts (4) and Cup (5)
        const serverGameMode = await tmc.server.call("GetGameMode");
        const serverInfo = await tmc.server.call("GetServerOptions", 0);
        const res: any = await this.api.call("dedimania.CurrentChallenge",
            map.UId,
            map.Name,
            map.Environnement,
            map.Author,
            "TMF",
            serverGameMode,
            {
                SrvName: serverInfo.Name,
                Comment: serverInfo.Comment,
                Private: serverInfo.Password != "",
                SrvIP: "127.0.0.1",
                SrvPort: "2350",
                XmlRpcPort: "5000",
                NumPlayers: tmc.players.get().filter((pl: Player) => !pl.isSpectator).length,
                MaxPlayers: serverInfo.CurrentMaxPlayers,
                NumSpectators: tmc.players.get().filter((pl: Player) => pl.isSpectator).length,
                MaxSpectators: serverInfo.CurrentMaxSpectators,
                LadderMode: serverInfo.LadderMode,
                NextFiveUID: "",
            },
            this.maxRank,
            this.getDedimaniaPlayers()
        );

        this.records = res.Records ?? [];
        tmc.debug("Dedimania: Got records.");
        tmc.server.emit("Plugin.Dedimania.onSync", this.records);
        await this.updateWidget();
    }

    async getDedimaniaPlayers() {
        const out = [];
        for (let player of tmc.players.get()) {
            out.push({
                Login: player.login,
                NickName: player.nickname,
                Nation: player.path,
                TeamId: -1,
                IsSpec: player.isSpectator,
                Ranking: player.ladderRank,
                isOff: false
            });
        }
        return out;
    }

    async onBeginMap(data: any) {
        const map: any = data[0];
        if (!this.enabled) return;
        try {
            await this.getRecords(map);
        } catch (e: any) {
            tmc.cli(e);
            await this.authenticate();;
            await this.getRecords(map);
        }
    }

    async updateWidget() {
        let outRecords = [];
        let x = 0;
        for (let record of this.records) {
            if (x >= 10) break;
            outRecords.push(
                {
                    rank: record.Rank,
                    nickname: escape(record.NickName),
                    time: tm.Time.fromMilliseconds(record.Best).toTmString().replace(/^0:/, ""),
                });
            x += 1;
        }
        const lastRecord: any = this.records[this.records.length - 1];
        if (lastRecord != undefined && lastRecord.Rank > 10) {
            outRecords.push(
                {
                    rank: lastRecord.Rank,
                    nickname: escape(lastRecord.NickName),
                    time: tm.Time.fromMilliseconds(lastRecord.Best).toTmString().replace(/^0:/, ""),
                }
            )
        }
        if (this.widget) {
            this.widget.setData({
                records: outRecords
            });
            this.widget.size = { width: 45, height: 4 * outRecords.length + 1 };
            await this.widget.display();
        }

    }

    async widgetClick(login: string, data: any) {
        tmc.chatCmd.execute(login, "/dedirecords");
    }

}