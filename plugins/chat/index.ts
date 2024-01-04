class ChatPlugin {
    enabled: boolean = false;

    constructor() {
        tmc.server.on("TMC.Init", this.onInit.bind(this));
    }

    async onInit() {
        try {
        tmc.server.send("ChatEnableManualRouting", true, false);
        tmc.server.on("Trackmania.PlayerChat", this.onPlayerChat.bind(this));
        this.enabled = true;
        } catch (e) {
            this.enabled = false;
            console.log(e);
            tmc.cli("ChatPlugin: ¤error¤Failed to enable chat plugin.");
        }
    }

    async onPlayerChat(data: any) {
        if (!this.enabled) return;
        if (data[0] == 0) return;
        if (data[2].startsWith("/")) return;
        const player = await tmc.getPlayer(data[1]);
        const nick = player.nickname;
        const text = data[2];
        const msg = `$fff${nick}$z$s$ff0 ${text}`;
        tmc.server.send("ChatSendServerMessage", msg);
        tmc.cli(msg);
    }
}

tmc.addPlugin("chat", new ChatPlugin);