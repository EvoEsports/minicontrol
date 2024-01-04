import { Player } from '../../core/playermanager';
import Api from './api';
import * as fs from 'fs';
import { colors, escape } from '../../core/utils';
import tm from 'tm-essentials';

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
    widgetTemplate: string = fs.readFileSync(__dirname + "/templates/widget.twig", "utf8");
    sendRecords: boolean = false;

    constructor() {
        tmc.server.on("TMC.Init", this.onInit.bind(this));
    }

    async onInit() {
        if (tmc.game.Name == "TmForever") {
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
                    // setInterval( () => { this.updatePlayers(); }, 240*1000);
                    this.getRecords(tmc.maps.currentMap);
                    tmc.server.on("Trackmania.BeginMap", this.onBeginMap.bind(this));
                    tmc.server.on("Trackmania.EndMap", this.onEndMap.bind(this));
                }
            } catch (e: any) {
                tmc.cli(e);
            }
        }
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
        tmc.debug("Dedimania: Updated players.");
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
                    nickname: escape(record.NickName.replace(/[$][lh]\[.*?\](.*?)([$][lh]){0,1}/i, "$1").replaceAll(/[$][lh]/gi, "")),
                    time: tm.Time.fromMilliseconds(record.Best).toTmString(),
                });
            x += 1;
        }
        const lastRecord: any = this.records[this.records.length - 1];
        if (lastRecord != undefined && lastRecord.Rank > 10) {
            outRecords.push(
                {
                    rank: lastRecord.Rank,
                    nickname: escape(lastRecord.NickName.replace(/[$][lh]\[.*?\](.*?)([$][lh]){0,1}/i, "$1").replaceAll(/[$][lh]/gi, "")),
                    time: tm.Time.fromMilliseconds(lastRecord.Best).toTmString(),
                }
            )
        }
        const xml = tmc.ui.render(this.widgetTemplate, { records: outRecords, id: this.widgetId, colors: colors });
        await tmc.ui.display(xml);
    }

}

tmc.addPlugin("tmnf_dedimania", new Dedimania());
