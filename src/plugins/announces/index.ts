export class AnnouncesPlugin {
    constructor() {
        tmc.server.on("Trackmania.BeginMap", this.onBeginMap.bind(this));
    }

    async onBeginMap(data: any) {
        const info = data[0];
        const msg = `Currently playing: $z$s$fff${info.Name}$z$s by $z$s$fff${info.Author}$z$s!`;
        await tmc.chat(msg);
        tmc.cli(msg);
    }
}

tmc.addPlugin("announces", new AnnouncesPlugin);
