export class AnnouncesPlugin {
    constructor() {
       tmc.server.on("TMC.Init", this.onInit.bind(this));
    }

    async onInit() {
        tmc.server.on("Trackmania.BeginMap", this.onBeginMap.bind(this));
        tmc.server.on("Trackmania.PlayerConnect", this.onPlayerConnect.bind(this));
        tmc.server.on("Trackmania.PlayerDisconnect", this.onPlayerDisconnect.bind(this));
    }
    
    async onBeginMap(data: any) {
        const info = data[0];
        const msg = `¤info¤Now Playing: ¤white¤${info.Name}¤info¤ by ¤white¤${info.AuthorNickname?info.AuthorNickname:info.Author}`;
        await tmc.chat(msg);
        tmc.cli(msg);
    }

    async onPlayerConnect(data: any) {
        const login = data[0];
        const player = await tmc.getPlayer(login);
        const msg = `¤white¤${player.nick}¤info¤ has joined!`;
        await tmc.chat(msg);
        tmc.cli(msg);
    }

    async onPlayerDisconnect(data: any) {
        const login = data[0];
        const player = await tmc.getPlayer(login);
        const msg = `¤white¤${player.nick}¤info¤ has left!`;
        await tmc.chat(msg);
        tmc.cli(msg);
    }

}

tmc.addPlugin("announces", new AnnouncesPlugin);
