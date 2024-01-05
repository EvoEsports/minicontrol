import Server from "./server";
import { clone } from "./utils";
// import casual from 'casual';

export class Player {
    login: string = "";
    nickname: string = "";
    isSpectator: boolean = false;
    teamId: number = -1;
    isAdmin: boolean = false;
    [key: string]: any; // Add index signature

    async syncFromDetailedPlayerInfo(data: any) {
        for (let key in data) {
            let k = key[0].toLowerCase() + key.slice(1);
            if (k == "nickName") {
                k = "nickname";
                data[key] = data[key].replace(/[$][lh]\[.*?\](.*?)([$][lh]){0,1}/i, "$1").replaceAll(/[$][lh]/gi, "");
            }
            this[k] = data[key];
        }                        
        this.isAdmin = tmc.admins.includes(data.Login);       
    }

    syncFromPlayerInfo(data: any) {
        this.login = data.Login;        
        // disabled for now, doens't need to be updated every time
        //    this.nickname = data.NickName.replace(/[$][lh]\[.*?\](.*?)([$][lh]){0,1}/i, "$1").replaceAll(/[$][lh]/gi, "")        
        this.teamId = Number.parseInt(data.TeamId);
        this.isSpectator = data.SpectatorStatus !== 0;
        this.isAdmin = tmc.admins.includes(data.Login);
    }
    
    set(key: string, value: any) {
        this[key] = value;
    }

}

export default class PlayerManager {
    private players: any = {};
    private server: Server;

    constructor(server: Server) {
        this.server = server;
        this.server.on("Trackmania.PlayerInfoChanged", this.onPlayerInfoChanged.bind(this));
    }


    async init() {
        const players = await this.server.call('GetPlayerList', -1, 0);
        for (const data of players) {
            if (data.PlayerId === 0) continue;
            await this.getPlayer(data.Login);
        }

        // Generate mock players
        /* for (let x = 0; x < 100; x++) {
             const player = new Player();
             player.login = "*Bot_"+casual.username;
             player.nick = casual.full_name;
             player.isSpectator = casual.coin_flip? true : false;
             this.players.push(player);
         } */
    }

    afterInit() {
        this.server.on("Trackmania.PlayerDisconnect", this.onPlayerDisconnect.bind(this));
    }

    private async onPlayerDisconnect(data: any) {
        const login = data[0];
        let index = 0;
        if (this.players[login]) {
            delete this.players[login];
        }
    }

    /**    
     * @returns {Player[]} Returns clone of the current playerlist
     */
    get(): Player[] {
        return clone(Object.values(this.players));
    }

    /**
     * @param nickname 
     * @returns {Player | null} Returns the player object or null if not found
     */
    async getPlayerbyNick(nickname: string): Promise<Player | null> {
        for (let player in this.players) {
            if (this.players[player].nick == nickname) return this.players[player];
        }
        return null;
    }

    /**
     * 
     * @param login 
     * @returns {Player} Returns the player object
     */
    async getPlayer(login: string): Promise<Player> {
        if (this.players[login]) return this.players[login];
        tmc.debug(`$888 Player ${login} not found, fetching from server.`);
        
        const data = await this.server.call("GetDetailedPlayerInfo", login);
        const player = new Player();
        await player.syncFromDetailedPlayerInfo(data);
        this.players[login] = player;
        return player;
    }

    private async onPlayerInfoChanged(data: any) {
        data = data[0];
        if (data.PlayerId === 0) return;
        if (this.players[data.Login]) {
            this.players[data.Login].syncFromPlayerInfo(data);
        } else {
            await this.getPlayer(data.Login);
        }
    }
}
