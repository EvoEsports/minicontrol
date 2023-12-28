import { GbxClient } from "@evotm/gbxclient";

export class Player {
    login: string = "";
    nick: string = "";
    isSpectator: boolean = false;
        
    syncFromPlayerInfo(data: any) {  
        this.login = data.Login;
        this.nick = data.NickName;
        this.isSpectator = data.SpectatorStatus !== 0;
    }
}

export default class PlayerManager {
    players: Player[] = [];
    gbx: GbxClient;
    
    constructor(gbx: GbxClient) {
        this.gbx = gbx;
        this.gbx.on("TrackMania.PlayerInfoChanged", () => this.onPlayerInfoChanged)
        this.gbx.on("TrackMania.PlayerDisconnect", () => this.onPlayerDisconnect)
    }
    
    async init() {
        const players = await this.gbx.call('GetPlayerList', -1, 0);
        for (const data of players) {
            if (data.PlayerId === 0) continue;
            const player = new Player();
            player.syncFromPlayerInfo(data);
            this.players.push(player);
        }
    }

    private async onPlayerDisconnect(login: any) {
        let index = 0;
        for (const player of this.players) {
            if (player.login == login) break;
            index += 1;
        }
        this.players.splice(index, 1);
    }
    
    
    async getPlayerbyNick(nickname: string): Promise<Player | null> {
        for (const player of this.players) {
            if (player.nick == nickname) return player;
        }
        return null;
    }
    
    async getPlayer(login: string): Promise<Player> {
        for (const player of this.players) {
            if (player.login == login) return player;
        }
        
        const player = new Player();
        const data = await this.gbx.call("GetPlayerInfo", login);
        player.syncFromPlayerInfo(data);
        this.players.push(player);
        return player;
    }
    
    private async onPlayerInfoChanged(data: any) {
        if (data.PlayerId === 0) return;
        const player = await this.getPlayer(data.Login);
        const orig_login = player.login;
        player.syncFromPlayerInfo(data);
        if (orig_login == "") {
            this.players.push(player);
        }
    }
}
