import { Player } from 'core/playermanager';
import Api from './api';
import * as fs from 'fs';
import { colors, escape } from 'core/utils';
import tm from 'tm-essentials';
import ListWindow from 'core/ui/listwindow';

export interface DediRecord {
    Login: string;
    NickName: string;
    Best: number;
    Rank: number;
    Checks: number[];
    Vote: number;
}

export class Dedimania {
    enabled: boolean = false;
    maxRank: number = 30;
    api: Api = new Api();
    serverLogin: string = "";
    sessionId: string = "";
    server: any = {};
    serverInfo: any = {};
    records: any = [];
    widgetId: string = tmc.ui.uuid();
    widgetAction: number = tmc.ui.addAction(this.widgetClick.bind(this), null);
    widgetTemplate: string = fs.readFileSync(import.meta.dir + "/templates/widget.twig", "utf8");
    sendRecords: boolean = false;

    constructor() {
        tmc.server.on("TMC.Init", this.onInit.bind(this));
    }

    async onInit() {
        if (tmc.game.Name == "TmForever") {
            tmc.debug("¤info¤Dedimania: TmForever detected, enabling plugin.");
            tmc.addCommand("/records", this.cmdDediRecords.bind(this), "Show dedimania records");

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
                    setInterval( async () => { await this.updatePlayers(); }, 180*1000);
                    this.getRecords(tmc.maps.currentMap);
                    tmc.server.on("Trackmania.BeginMap", this.onBeginMap.bind(this));
                    tmc.server.on("Trackmania.EndMap", this.onEndMap.bind(this));
                }
            } catch (e: any) {
                tmc.cli(e);
            }
        }
    }

    async cmdDediRecords(login: string, args: string[]) {
        let records = [];
        for (let record of this.records) {
            records.push(
                {
                    rank: record.Rank,
                    nickname: escape(record.NickName),
                    time: "$o"+tm.Time.fromMilliseconds(record.Best).toTmString().replace(/^0:/, ""),
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
        const xml = tmc.ui.render(this.widgetTemplate, { records: outRecords, id: this.widgetId, colors: colors, action: this.widgetAction });
        await tmc.ui.display(xml);
    }

    async widgetClick(login: string, data: any) {
        tmc.chatCmd.execute(login, "/records");
    }

}

tmc.addPlugin("tmnf_dedimania", new Dedimania());
