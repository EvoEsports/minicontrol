import { clone } from "./utils";

interface PlayerRanking {
    Path: string;
    Score: number;
    Ranking: number;
    TotalCount: number;
}

interface Avatar {
    FileName: string;
    Checksum: string;
}

interface LadderStats {
    LastMatchScore: number;
    NbrMAtchWins: number;
    NbrMatchDraws: number;
    nbrMatchLosses: number;
    TeamName: string;
}

/**
 * Player class
 */
export class Player {
    login = "";
    nickname = "";
    customNick: string | null = null;
    playerId = -1;
    teamId = -1;
    path = "";
    language = "en";
    clientVersion = "";
    iPAddress = "";
    downloadRate = -1;
    uploadRate = -1;
    isSpectator = false;
    ladderRanking = 0;
    ladderStats?: LadderStats;
    avatar?: Avatar;
    hoursSinceZoneInscription = -1;
    /** 3 for united */
    onlineRights = -1;
    isAdmin = false;

    /** playerId in server */
    spectatorTarget = 0;
    flags = 0;

    /** 0, 1 or 2*/
    forcedSpectatorState = 0;
    isReferee = false;
    isPodiumReady = false;
    isUsingStereoScopy = false
    isManagedByOtherServer = false;
    isServer = false
    hasPlayerSlot = false;
    isBroadcasting = false
    hasJoinedGame = false;
    ranking?: PlayerRanking;

    [key: string]: any; // Add index signature

    syncFromDetailedPlayerInfo(data: any) {
        for (const key in data) {
            let k = key[0].toLowerCase() + key.slice(1);
            if (k === "nickName") {
                k = "nickname";
                data[key] = data[key].replace(/[$][lh]\[.*?](.*?)([$][lh])?/i, "$1").replaceAll(/[$][lh]/gi, "");
            }
            this[k] = data[key];
        }
        this.parseFlags(data);
        this.isAdmin = tmc.admins.includes(data.Login);
    }

    syncFromPlayerInfo(data: any) {
        this.login = data.Login;
        this.teamId = Number.parseInt(data.TeamId, 10);
        this.parseFlags(data);
        this.isSpectator = data.SpectatorStatus !== 0;
        this.isAdmin = tmc.admins.includes(data.Login);
    }

    private parseFlags(data: any) {
        this.forcedSpectatorState = data.Flags % 10;
        this.isReferee = Math.floor(data.Flags / 10) % 10 === 1;
        this.isPodiumReady = Math.floor(data.Flags / 100) % 10 === 1;
        this.isUsingStereoScopy = Math.floor(data.Flags / 1000) % 10 === 1;
        this.isManagedByOtherServer = Math.floor(data.Flags / 10000) % 10 === 1;
        this.isServer = Math.floor(data.Flags / 100000) % 10 === 1;
        this.hasPlayerSlot = Math.floor(data.Flags / 1000000) % 10 === 1;
        this.isBroadcasting = Math.floor(data.Flags / 10000000) % 10 === 1;
        this.hasJoinedGame = Math.floor(data.Flags / 100000000) % 10 === 1;
        this.spectatorTarget = Math.floor(data.SpecatorStatus / 10000);
    }

    set(key: string, value: any) {
        this[key] = value;
    }
}
/**
 * PlayerManager class
 */
export default class PlayerManager {
    private players: { [key: string]: Player } = {};

    /**
     * Initialize the player manager
     * @returns {Promise<void>}
     * @ignore
     */
    async init(): Promise<void> {
        tmc.server.addListener("Trackmania.PlayerInfoChanged", this.onPlayerInfoChanged, this);
        const players = await tmc.server.call("GetPlayerList", -1, 0);
        for (const data of players) {
            if (data.PlayerId === 0) continue;
            if (data.Login === tmc.server.login) continue;
            await this.getPlayer(data.Login);
        }
    }

    /**
     * Called after the server has been initialized
     * @ignore
     */
    afterInit() {
        tmc.server.addListener("Trackmania.PlayerConnect", this.onPlayerConnect, this);
        tmc.server.addListener("Trackmania.PlayerDisconnect", this.onPlayerDisconnect, this);
    }

    /**
     * @ignore
     */
    private async onPlayerConnect(data: any) {
        const login = data[0].toString();
        if (login) {
            if (this.players[login]) {
                tmc.cli(`$888Player ${login} already connected, kicking player due a bug to allow them joining again.`);
                tmc.server.send("Kick", login, "You are already connected, please rejoin.");
                return;
            }
            const player = await this.getPlayer(login);
            tmc.server.emit("TMC.PlayerConnect", player);
        } else {
            tmc.debug("¤error¤Unknown player tried to connect, ignored.");
        }
    }

    /**
     * callback for when a player disconnects
     * @ignore
     * @param data data from the server
     */
    private async onPlayerDisconnect(data: any) {
        const login = data[0].toString();
        const reason = data[1] || "";
        if (login && this.players[login]) {
            tmc.server.emit("TMC.PlayerDisconnect", clone(this.players[login]), reason);
            delete this.players[login];
        } else {
            tmc.debug(`¤Error¤Unknown player ($fff${login}¤error¤) tried to disconnect or player not found at server. ignored.`);
        }
    }

    /**
     * get players objects
     * @returns {Player[]} Returns current playerlist
     */
    getAll(): Player[] {
        return Object.values(this.players);
    }

    getAllLogins(): string[] {
        return Object.keys(this.players);
    }

    /**
     * get player by nickname
     * @param nickname
     * @returns {Player | null} Returns the player object or null if not found
     */
    getPlayerbyNick(nickname: string): Player | null {
        for (const player in this.players) {
            if (this.players[player].nickname === nickname) return this.players[player];
        }
        return null;
    }

    /**
     * gets player object
     * @param login
     * @returns {Player} Returns the player object
     */
    async getPlayer(login: string): Promise<Player> {
        if (login === tmc.server.login) {
            tmc.cli("¤error¤Tried to fetch server login as a player.");
            return new Player();
        }
        if (this.players[login]) return this.players[login];

        try {
            tmc.debug(`$888Player "${login}" not found, fetching from server.`);
            const data = await tmc.server.call("GetDetailedPlayerInfo", login);
            const player = new Player();
            player.syncFromDetailedPlayerInfo(data);
            this.players[login] = player;
            return player;
        } catch (e: any) {
            return new Player();
        }
    }

    /**
     * callback for when a player info changes
     * @ignore
     * @param data data from the server
     * @returns
     */
    private async onPlayerInfoChanged(data: any) {
        const playerData = data[0];
        if (playerData.PlayerId === 0 || playerData.Login === tmc.server.login) return;
        if (this.players[playerData.Login]) {
            this.players[playerData.Login].syncFromPlayerInfo(playerData);
        } else {
            // if player has joined the game, fetch detailed info
            if (Math.floor(playerData.Flags / 100000000) % 10 === 1) {
                this.getPlayer(playerData.Login);
            }
        }
    }
}
