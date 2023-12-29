import { GbxClient } from "@evotm/gbxclient";
import Server from "./server";
// import casual from 'casual';

export class Player {
    login: string = "";
    nick: string = "";
    isSpectator: boolean = false;
    teamId: number = -1;

    syncFromPlayerInfo(data: any) {
        this.login = data.Login;
        this.nick = data.NickName;
        this.teamId = Number.parseInt(data.TeamId);
        this.isSpectator = data.SpectatorStatus !== 0;
    }
}

export default class PlayerManager {
    players: any = {};
    server: Server;

    constructor(server: Server) {
        this.server = server;        
        this.server.on("Trackmania.PlayerInfoChanged", this.onPlayerInfoChanged.bind(this));
    }


    async init() {
        const players = await this.server.call('GetPlayerList', -1, 0);
        for (const data of players) {
            if (data.PlayerId === 0) continue;
            const player = new Player();
            player.syncFromPlayerInfo(data);
            this.players[data.Login] = player;
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

    get(): Player[] {
        return Object.values(this.players);
    }

    async getPlayerbyNick(nickname: string): Promise<Player | null> {
        for (let player in this.players) {
            if (this.players[player].nick == nickname) return this.players[player];
        }
        return null;
    }

    async getPlayer(login: string): Promise<Player> {
        if (this.players[login]) return this.players[login];
        tmc.debug(`Player ${login} not found, fetching from server.`);

        const data = await this.server.call("GetPlayerInfo", login);
        const player = new Player();
        player.syncFromPlayerInfo(data);
        this.players[login] = player;
        return player;
    }

    private async onPlayerInfoChanged(data: any) {
        data = data[0];
        if (data.PlayerId === 0) return;
        const player = new Player();
        player.syncFromPlayerInfo(data);
        this.players[data.Login] = player;
    }
}
