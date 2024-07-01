import Plugin from '../index';

export default class Chat extends Plugin {
    enabled: boolean = false;

    async onLoad() {
        try {
            await tmc.server.call("ChatEnableManualRouting", true, false);
            this.enabled = true;
            tmc.server.addListener("Trackmania.PlayerChat", this.onPlayerChat, this);
        } catch (e: any) {
            this.enabled = false;      
            tmc.cli("ChatPlugin: ¤error¤ " + e.message);
        }
    }

    async onUnload() {
        try {
            await tmc.server.call("ChatEnableManualRouting", false, false);
        } catch (e: any) {
            tmc.cli(e.message);
        }
        tmc.server.removeListener("Trackmania.PlayerChat", this.onPlayerChat.bind(this));
        this.enabled = false;
    }
    
    async onPlayerChat(data: any) {
        if (!this.enabled) return;
        if (data[0] == 0) return;
        if (data[2].startsWith("/")) return;
        const player = await tmc.getPlayer(data[1]);
        const nick = player.nickname.replaceAll(/\$[iwozs]/ig, "");
        const text = data[2].replaceAll(/[\n\r\t]/g, "").replace(/[$]$/, "").trim();
        const msg = `$fff${nick}$z$s$fff »$ff0 ${text}`;
        tmc.server.send("ChatSendServerMessage", msg);
        tmc.cli(msg);
    }
}