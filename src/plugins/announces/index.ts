export class AnnouncesPlugin {
    constructor() {
        tmc.server.on("Trackmania.BeginMap", this.onBeginMap.bind(this));
        tmc.server.on("Trackmania.PlayerConnect", this.onPlayerConnect.bind(this));
        tmc.server.on("Trackmania.PlayerDisconnect", this.onPlayerDisconnect.bind(this));
    }

    async onBeginMap(data: any) {
        const info = data[0];
        console.log(info);
        const msg = `$fffCurrently Playing: $z$s$fff${info.Name}$z$s$fff by $z$s$fff${info.AuthorNickname?info.AuthorNickname:info.Author}$z$s$fff!`;
        await tmc.chat(msg);
        tmc.cli(msg);
    }

    async onPlayerConnect(data: any) {
        const login = data[0];
        const player = await tmc.getPlayer(login);
        const msg = `$z$s$fff${player.nick}$z$s$fff has joined the game!`;
        await tmc.chat(msg);
        tmc.cli(msg);
    }

    async onPlayerDisconnect(data: any) {
        const login = data[0];
        const player = await tmc.getPlayer(login);
        const msg = `$z$s$fff${player.nick}$z$s$fff has left the game!`;
        await tmc.chat(msg);
        tmc.cli(msg);
    }

}

tmc.addPlugin("announces", new AnnouncesPlugin);
