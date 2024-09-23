import { Player } from '@core/playermanager';
import Api from './api';
import { clone, escape, formatTime, removeColors } from '@core/utils';
import ListWindow from '@core/ui/listwindow';
import Plugin from '@core/plugins';

export interface DediRecord {
    Game?: string;
    Login: string;
    NickName: string;
    Best: number;
    Rank: number;
    Checks: number[];
    MaxRank?: number;
    Vote: number;
}

export default class Dedimania extends Plugin {
    static depends: string[] = ["game:TmForever"];
    enabled: boolean = false;
    maxRank: number = 30;
    api: Api = new Api();
    serverLogin: string = "";
    sessionId: string = "";
    server: any = {};
    serverInfo: any = {};
    records: DediRecord[] = [];
    intervalId: NodeJS.Timeout | null = null;

    async onLoad() {
        tmc.cli("¤info¤Dedimania: TmForever detected, enabling plugin.");
        tmc.addCommand("/dedirecords", this.cmdDediRecords.bind(this), "Show dedimania records");
        tmc.server.addListener("TMC.PlayerFinish", this.onPlayerFinish, this);
        this.serverInfo = await tmc.server.call("GetMainServerPlayerInfo");
        this.serverLogin = this.serverInfo.Login;
        const pass = process.env.DEDIMANIA_PASS || "";
        if (pass == "") {
            this.enabled = false;
            return;
        }
    }

    async onUnload() {
        clearInterval(this.intervalId!);
        tmc.removeCommand("/dedirecords");
        tmc.server.removeListener("Trackmania.BeginMap", this.onBeginMap.bind(this));
        tmc.server.removeListener("Trackmania.EndMap", this.onEndMap.bind(this));
        tmc.server.removeListener("TMC.PlayerFinish", this.onPlayerFinish);
    }

    async onStart() {
        const menu = tmc.storage["menu"];
        if (menu) {
            menu.addItem({
                category: "Map",
                title: "Show: Dedimania",
                action: "/dedirecords"
            });
        }
        try {
            const res = await this.authenticate();
            if (res) {
                tmc.cli("¤info¤Dedimania: Authenticated.");
                await this.updatePlayers();
                this.intervalId = setInterval(async () => {
                    await this.updatePlayers();
                }, 180 * 1000);
                await this.getRecords(tmc.maps.currentMap);
                tmc.server.addListener("Trackmania.BeginMap", this.onBeginMap, this);
                tmc.server.addListener("Trackmania.EndMap", this.onEndMap, this);
            } else {
                tmc.cli("¤error¤Dedimania: Failed to authenticate.");
            }
        } catch (e: any) {
            tmc.cli(e);
        }
    }

    async cmdDediRecords(login: string, args: string[]) {
        let records = [];
        for (let record of this.records) {
            records.push(
                {
                    rank: record.Rank,
                    nickname: escape(record.NickName),
                    time: "$o" + formatTime(record.Best),
                });
            }
            const window = new ListWindow(login);
            window.size = { width: 90, height: 95 };
            window.title = "Dedimania Records [" + this.records.length + "]";
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
            await this.api.call('dedimania.UpdateServerPlayers',
                "TMF",
                serverGameMode,
                {
                    SrvName: serverInfo.Name,
                    Comment: serverInfo.Comment,
                    Private: serverInfo.Password != "",
                    SrvIP: "127.0.0.1",
                    SrvPort: "2350",
                    XmlRpcPort: "5000",
                    NumPlayers: tmc.players.getAll().filter((pl: Player) => !pl.isSpectator).length,
                    MaxPlayers: serverInfo.CurrentMaxPlayers,
                    NumSpectators: tmc.players.getAll().filter((pl: Player) => pl.isSpectator).length,
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
        * @returns
        */
        async authenticate(): Promise<boolean> {
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
                PlayersGame: true
            }
        );

        this.enabled = res ?? false;
        return this.enabled;
    }

    async onPlayerFinish(data: any) {
        if (!this.enabled) return;
        const player: Player = await tmc.players.getPlayer(data[0]);
        const time: number = data[1];

        if (this.records.length < 1) {
            const record = {
                Login: player.login,
                NickName: player.nickname,
                Best: time,
                Rank: 1,
                Checks: [],
                Vote: 0
            };
            this.records.push(record);
            tmc.server.emit("Plugin.Dedimania.onNewRecord",
                {
                    oldRecord: null,
                    record: clone(record || {}),
                    records: clone(this.records)
                });
                return;
            }

            const lastIndex = this.records.length > this.maxRank ? this.maxRank : this.records.length;
            const lastRecord = this.records[lastIndex - 1];
            if (lastIndex >= this.maxRank && time > lastRecord.Best) return;
            const oldRecord = clone(this.records.find(r => r.Login === player.login));
            if (oldRecord && time > oldRecord.Best) return;
            let newRecord = clone(oldRecord);
            if (oldRecord) {
                if (time < oldRecord.Best) {
                    const record = this.records[oldRecord.Rank-1];
                    record.Best = time;
                    newRecord.Best = time;
                }
            } else {
                newRecord = {
                    Login: player.login,
                    NickName: player.nickname,
                    Best: time,
                    Rank: 0,
                    Checks: [],
                    Vote: 0
                };
                this.records.push(newRecord);
            }
            this.records.sort((a: DediRecord, b: DediRecord) => a.Best - b.Best);
            this.records = this.records.slice(0, this.maxRank);
            for (let i = 0; i < this.records.length; i++) {
                this.records[i].Rank = i + 1;
                if (this.records[i].Login === player.login) {
                    newRecord = this.records[i];
                }
            }

            tmc.server.emit("Plugin.Dedimania.onNewRecord",
                {
                    oldRecord: clone(oldRecord),
                    record: clone(newRecord),
                    records: clone(this.records)
                });
            }

            async onEndMap(data: any) {
                if (!this.enabled) return;
                const serverGameMode = await tmc.server.call("GetGameMode");
                const scores: any = data[0];
                const map: any = data[1];
                try {
                    await this.api.call("dedimania.ChallengeRaceTimes",
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
                    if (score.BestCheckpoints.length < 1) continue;
                    out.push({
                        Login: score.Login,
                        Best: score.BestTime,
                        Checks: score.BestCheckpoints.join(",")
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
                        NumPlayers: tmc.players.getAll().filter((pl: Player) => !pl.isSpectator).length,
                        MaxPlayers: serverInfo.CurrentMaxPlayers,
                        NumSpectators: tmc.players.getAll().filter((pl: Player) => pl.isSpectator).length,
                        MaxSpectators: serverInfo.CurrentMaxSpectators,
                        LadderMode: serverInfo.LadderMode,
                        NextFiveUID: "",
                    },
                    this.maxRank,
                    this.getDedimaniaPlayers()
                );
                this.records = res.Records ?? [];
                tmc.debug("Dedimania: Got records.");
                tmc.server.emit("Plugin.Dedimania.onSync", clone(this.records));
            }

            async getDedimaniaPlayers() {
                const out = [];
                for (let player of tmc.players.getAll()) {
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
                    await this.authenticate();
                    await this.getRecords(map);
                }
            }

        }