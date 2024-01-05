import Plugin from 'core/plugins';

export default class Chat extends Plugin {
    enabled: boolean = false;

    async onLoad() {
        try {
            await tmc.server.call("ChatEnableManualRouting", true, false) as boolean;
            this.enabled = true;
            tmc.server.on("Trackmania.PlayerChat", this.onPlayerChat.bind(this));
        } catch (e: any) {
            this.enabled = false;      
            tmc.cli("ChatPlugin: ¤error¤ " + e.message);
        }
    }

    async onUnload() {
        try {
            await tmc.server.call("ChatEnableManualRouting", false, false);
        } catch (e: any) {
            console.log(e.message);
        }
        tmc.server.removeListener("Trackmania.PlayerChat", this.onPlayerChat.bind(this));
        this.enabled = false;
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