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
    api: Api = new Api();
    serverLogin: string = "";
    sessionId: string = "";
    serverInfo: any = {};
    records: any = [];
    widgetId: string = tmc.ui.uuid();
    widgetTemplate: string = fs.readFileSync(__dirname + "/templates/widget.twig", "utf8");

    constructor() {
        tmc.server.on("TMC.Init", this.onInit.bind(this));
    }

    async onInit() {
        if (tmc.game.Name == "TmForever") {
            this.serverInfo = await tmc.server.call("GetMainServerPlayerInfo");
            this.serverLogin = this.serverInfo.Login;
            const server = await tmc.server.call("GetDetailedPlayerInfo", this.serverInfo.Login);
            const packmask = await tmc.server.call("GetServerPackMask");
            const pass = process.env.DEDIMANIA_PASS || "";
            if (pass == "") {
                this.enabled = false;
                return;
            }

            const res: any = await this.api.call("dedimania.Authenticate", {
                Game: 'TMF',
                Login: this.serverLogin,
                Password: pass.toString(),
                Tool: "MINIcontrol",
                Version: tmc.version,
                Nation: server.Path,
                Packmask: packmask,
                ServerVersion: tmc.game.Version,
                ServerBuild: tmc.game.Build
            }
            );

            this.enabled = res ?? false;

            if (res == true) {
                tmc.cli("¤info¤Dedimania: Authenticated.");
                this.getRecords();
                tmc.server.on("Trackmania.BeginMap", this.onBeginMap.bind(this));
            }
        }
    }

    async getRecords() {
        if (!this.enabled) return;

        // Rounds (0), TimeAttack (1), Team (2), Laps (3), Stunts (4) and Cup (5)
        const serverGameMode = await tmc.server.call("GetGameMode");
        const serverInfo = await tmc.server.call("GetServerOptions", 0);

        const res: any = await this.api.call("dedimania.CurrentChallenge",
            tmc.maps.currentMap?.UId,
            tmc.maps.currentMap?.Name,
            tmc.maps.currentMap?.Environnement,
            tmc.maps.currentMap?.Author,
            "TMF",
            serverGameMode,
            {
                SrvName: serverInfo.Name,
                Comment: serverInfo.Comment,
                Private: serverInfo.Password != "",
                SrvIP: "127.0.0.1",
                SrvPort: "5000",
                XmlRpcPort: "5000",
                NumPlayers: tmc.players.get().filter((pl: Player) => !pl.isSpectator).length,
                MaxPlayers: serverInfo.CurrentMaxPlayers,
                NumSpectators: tmc.players.get().filter((pl: Player) => pl.isSpectator).length,
                MaxSpectators: serverInfo.CurrentMaxSpectators,
                LadderMode: serverInfo.LadderMode,
                NextFiveUID: "",
            },
            30,
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

    async onBeginMap() {
        await this.getRecords();
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
        const xml = tmc.ui.render(this.widgetTemplate, { records: outRecords, id: this.widgetId, colors: colors });
        await tmc.ui.display(xml);
    }

}

tmc.addPlugin("tmnf_dedimania", new Dedimania());
