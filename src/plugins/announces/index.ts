export class AnnouncesPlugin {
    constructor() {
        tmc.server.on("Trackmania.BeginMap", this.onBeginMap.bind(this));
        tmc.server.on("Trackmania.PlayerConnect", this.onPlayerConnect.bind(this));
        tmc.server.on("Trackmania.PlayerDisconnect", this.onPlayerDisconnect.bind(this));
    }

    async onBeginMap(data: any) {
        const info = data[0];
        const msg = `Now Playing: ¤white¤${info.Name}¤brand¤ by ¤white¤${info.AuthorNickname?info.AuthorNickname:info.Author}`;
        await tmc.chat(msg);
        tmc.cli(msg);
    }

    async onPlayerConnect(data: any) {
        const login = data[0];
        const player = await tmc.getPlayer(login);
        const msg = `¤white¤${player.nick}¤brand¤ has joined!`;
        await tmc.chat(msg);
        tmc.cli(msg);
    }

    async onPlayerDisconnect(data: any) {
        const login = data[0];
        const player = await tmc.getPlayer(login);
        const msg = `¤white¤${player.nick}¤brand¤ has left!`;
        await tmc.chat(msg);
        tmc.cli(msg);
    }

}

tmc.addPlugin("announces", new AnnouncesPlugin);
