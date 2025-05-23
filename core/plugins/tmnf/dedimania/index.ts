import type { Player } from "@core/playermanager";
import Api from "./api";
import { clone, htmlEntities, formatTime } from "@core/utils";
import ListWindow from "@core/ui/listwindow";
import Plugin from "@core/plugins";

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
    static depends: string[] = ["game:TmForever", "tmnf"];
    enabled = true;
    authError = false;

    maxRank = 30;
    api: Api = new Api();
    serverLogin = "";
    server: any = {};
    serverInfo: any = {};
    records: DediRecord[] = [];
    intervalId: NodeJS.Timeout | undefined = undefined;
    pass: string = process.env.DEDIMANIA_PASS || "";

    async onLoad() {
        tmc.cli("¤info¤Dedimania: TmForever detected, enabling plugin.");
        tmc.addCommand("/dedirecords", this.cmdDediRecords.bind(this), "Show dedimania records");
        tmc.server.addListener("TMC.PlayerFinish", this.onPlayerFinish, this);
        tmc.server.addListener("Trackmania.BeginMap", this.onBeginMap, this);
        tmc.server.addListener("Trackmania.EndMap", this.onEndMap, this);

        this.serverInfo = await tmc.server.call("GetMainServerPlayerInfo");
        this.serverLogin = this.serverInfo.Login;

        if (this.pass === "") {
            this.enabled = false;
            tmc.cli("¤error¤Dedimania: No password set, plugin disabled.");
            return;
        }
    }

    async onUnload() {
        clearInterval(this.intervalId);
        tmc.removeCommand("/dedirecords");
        tmc.server.removeListener("Trackmania.BeginMap", this.onBeginMap.bind(this));
        tmc.server.removeListener("Trackmania.EndMap", this.onEndMap.bind(this));
        tmc.server.removeListener("TMC.PlayerFinish", this.onPlayerFinish);
    }

    async onStart() {
        const menu = tmc.storage["menu"];
        if (menu) {
            menu.addItem({
                category: "Records",
                title: "Dedimania Records",
                action: "/dedirecords",
            });
        }

        this.authenticate()
            .then((res) => {
                if (res) {
                    tmc.cli("¤info¤Dedimania: Authenticated.");
                    this.intervalId = setInterval(async () => {
                        try {
                            await this.updatePlayers();
                        } catch (e: any) {
                            tmc.cli(`¤error¤Dedimania: ${e.message}`);
                        }
                    }, 180 * 1000);
                    this.updatePlayers().then(async () => await this.getRecords(tmc.maps.currentMap));
                } else {
                    tmc.cli("¤error¤Dedimania: Failed to authenticate.");
                }
            })
            .catch((e) => {
                tmc.cli(`¤error¤Dedimania: ${e.message}`);
            });
    }

    async cmdDediRecords(login: string, _args: string[]) {
        const records: any = [];
        for (const record of this.records) {
            records.push({
                rank: record.Rank,
                nickname: htmlEntities(record.NickName),
                time: `$o${formatTime(record.Best)}`,
            });
        }
        const window = new ListWindow(login);
        window.size = { width: 90, height: 95 };
        window.title = `Dedimania Records [${this.records.length}]`;
        window.setItems(records);
        window.setColumns([
            { key: "rank", title: "Rank", width: 10 },
            { key: "nickname", title: "Nickname", width: 50 },
            { key: "time", title: "Time", width: 20 },
        ]);
        window.display();
    }

    /**
     * Update the players on dedimania.
     */
    async updatePlayers() {
        if (!this.enabled) return;
        const serverGameMode = await tmc.server.call("GetGameMode");
        const serverInfo = await tmc.server.call("GetServerOptions", 0);
        try {
            if (this.authError) {
                tmc.cli("¤info¤Dedimania: Re-authenticating.");
                const answer = await this.authenticate();
                if (!answer) {
                    tmc.cli("¤error¤Dedimania: Failed to authenticate.");
                    return;
                }
            }

            await this.api.call(
                "dedimania.UpdateServerPlayers",
                "TMF",
                serverGameMode,
                {
                    SrvName: serverInfo.Name,
                    Comment: serverInfo.Comment,
                    Private: serverInfo.Password !== "",
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
                this.getDedimaniaPlayers(),
            );
            tmc.debug("¤info¤Dedimania: Updated players.");
        } catch (e: any) {
            tmc.cli(`¤error¤Dedimania: ${e.message}`);
            this.authError = true;
        }
    }

    /**
     * authenticate to dedimania
     * @returns
     */
    async authenticate(): Promise<boolean> {
        this.server = await tmc.server.call("GetDetailedPlayerInfo", this.serverInfo.Login);
        try {
            const res: any = await this.api.call("dedimania.Authenticate", {
                Game: "TMF",
                Login: this.serverLogin,
                Password: this.pass.toString(),
                Tool: "MINIcontrol",
                Version: tmc.version,
                Nation: this.server.Path,
                Packmask: tmc.server.packmask,
                PlayersGame: true,
            });
            const res2 = await this.api.call("dedimania.ValidateAccount");
            if (res2?.Status) {
                tmc.cli("¤info¤Dedimania: Account validated.");
            }
            if (res) {
                this.enabled = true;
                this.authError = false;
                return true;
            }
        } catch (e: any) {
            console.log(e);
            tmc.cli(`¤error¤Dedimania: ${e.message}`);
            this.authError = true;
        }

        return false;
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
                Vote: 0,
            };
            this.records.push(record);
            tmc.server.emit("Plugin.Dedimania.onNewRecord", {
                oldRecord: null,
                record: clone(record || {}),
                records: clone(this.records),
            });
            return;
        }

        const lastIndex = this.records.length > this.maxRank ? this.maxRank : this.records.length;
        const lastRecord = this.records[lastIndex - 1];
        if (lastIndex >= this.maxRank && time > lastRecord.Best) return;
        const oldRecord = clone(this.records.find((r) => r.Login === player.login));
        if (oldRecord && time > oldRecord.Best) return;
        let newRecord = clone(oldRecord);
        if (oldRecord) {
            if (time <= oldRecord.Best) {
                const record = this.records[oldRecord.Rank - 1];
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
                Vote: 0,
            };
            this.records.push(newRecord);
        }

        this.records.sort((a: DediRecord, b: DediRecord) => {
            if (a.Best === b.Best) return 0;
            if (a.Best < b.Best) return -1;
            if (a.Best > b.Best) return 1;
            return 0;
        });

        for (let i = 0; i < this.records.length; i++) {
            this.records[i].Rank = i + 1;
            if (this.records[i].Login === player.login) {
                newRecord = this.records[i];
            }
        }

        this.records = this.records.slice(0, this.maxRank);

        if (newRecord.Rank < this.maxRank) {
            tmc.server.emit("Plugin.Dedimania.onNewRecord", {
                oldRecord: clone(oldRecord),
                record: clone(newRecord),
                records: clone(this.records),
            });
        }
    }

    async onEndMap(data: any) {
        if (!this.enabled) return;
        const serverGameMode = await tmc.server.call("GetGameMode");
        const scores: any = data[0];
        const map: any = data[1];
        try {
            await this.api.call(
                "dedimania.ChallengeRaceTimes",
                map.UId,
                map.Name,
                map.Environnement,
                map.Author,
                "TMF",
                serverGameMode,
                map.NbCheckpoints,
                this.maxRank,
                this.getDedimaniaScores(scores),
            );
            tmc.debug("¤info¤Dedimania: Sent scores.");
        } catch (e: any) {
            tmc.cli(`¤error¤Dedimania: ${e.message}`);
            this.authError = true;
            try {
                tmc.cli("¤info¤Dedimania: Error occurred, re-authenticating and retrying...");
                const authRes = await this.authenticate();
                if (authRes) {
                    await this.api.call(
                        "dedimania.ChallengeRaceTimes",
                        map.UId,
                        map.Name,
                        map.Environnement,
                        map.Author,
                        "TMF",
                        serverGameMode,
                        map.NbCheckpoints,
                        this.maxRank,
                        this.getDedimaniaScores(scores),
                    );
                    tmc.cli("¤info¤Dedimania: Scores sent after retry.");
                    return;
                }
            } catch (retryError: any) {
                tmc.cli(`¤error¤Dedimania (retry): ${retryError.message}`);
            }
        }
    }

    getDedimaniaScores(scores: any) {
        const out: any = [];
        for (const score of scores) {
            if (score.BestCheckpoints.length < 1) continue;
            out.push({
                Login: score.Login,
                Best: score.BestTime,
                Checks: score.BestCheckpoints.join(","),
            });
        }
        return out;
    }

    async getRecords(map: any) {
        if (!this.enabled) return;
        if (!map) return;
        // Rounds (0), TimeAttack (1), Team (2), Laps (3), Stunts (4) and Cup (5)
        const serverGameMode = await tmc.server.call("GetGameMode");
        const serverInfo = tmc.server.serverOptions;

        try {
            const res: any = await this.api.call(
                "dedimania.CurrentChallenge",
                map.UId,
                map.Name,
                map.Environnement,
                map.Author,
                "TMF",
                serverGameMode,
                {
                    SrvName: serverInfo.Name,
                    Comment: serverInfo.Comment,
                    Private: serverInfo.Password !== "",
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
                this.getDedimaniaPlayers(),
            );
            if (res.Uid !== map.UId) {
                tmc.cli("¤error¤Dedimania: Map UId does not match.");
                this.records = [];
                tmc.server.emit("Plugin.Dedimania.onSync", clone(this.records));
                return;
            }
            this.records = res?.Records ?? [];
            tmc.debug("¤info¤Dedimania: Got records.");
            tmc.server.emit("Plugin.Dedimania.onSync", clone(this.records));
        } catch (e: any) {
            this.records = [];
            this.authError = true;
            tmc.server.emit("Plugin.Dedimania.onSync", clone(this.records));
            tmc.cli(`¤error¤Dedimania: ${e.message}`);
        }
    }

    async getDedimaniaPlayers() {
        const out: any = [];
        for (const player of tmc.players.getAll()) {
            out.push({
                Login: player.login,
                NickName: player.nickname,
                Nation: player.path,
                TeamId: -1,
                IsSpec: player.isSpectator,
                Ranking: player.ladderRank,
                isOff: false,
            });
        }
        return out;
    }

    async onBeginMap(data: any) {
        if (!this.enabled) return;
        const map: any = data[0];

        try {
            await this.getRecords(map);
        } catch (e: any) {
            tmc.cli(e.message);
            this.authenticate().then(async (res) => {
                if (res) {
                    await this.getRecords(map);
                }
            });
        }
    }
}
