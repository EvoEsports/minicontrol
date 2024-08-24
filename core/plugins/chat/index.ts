import Plugin from '../index';

export default class Chat extends Plugin {
    static depends: string[] = [];
    pluginEnabled: boolean = false;
    publicChatEnabled: boolean = true;
    playersDisabled: string[] = [];

    async onLoad() {
        try {
            this.pluginEnabled = await tmc.server.call("ChatEnableManualRouting", true, false) as boolean;
            tmc.server.addListener("Trackmania.PlayerChat", this.onPlayerChat, this);
            tmc.addCommand("//chat", this.cmdChat.bind(this), "Controls chat");
        } catch (e: any) {
            this.pluginEnabled = false;
            tmc.cli("ChatPlugin: ¤error¤ " + e.message);
        }
    }

    async onUnload() {
        try {
            await tmc.server.call("ChatEnableManualRouting", false, false);
        } catch (e: any) {
            console.log(e.message);
        }
        tmc.removeCommand("//chat");
        tmc.server.removeListener("Trackmania.PlayerChat", this.onPlayerChat);
        this.pluginEnabled = false;
    }

    async cmdChat(login: string, params: string[]) {
        if (params.length == 0) {
            tmc.chat("¤info¤usage: ¤cmd¤//chat <on/off> ¤info¤ or ¤cmd¤//chat <login> <on/off>")
            return;
        }
        if (params.length == 1 && ["on", "off"].includes(params[0])) {
            this.publicChatEnabled = false;
            if (params[0] == "on") this.publicChatEnabled = true;
            tmc.chat("¤info¤Public chat is ¤white¤" + params[0]);
            return;
        }
        if (params.length == 2 && ["on", "off"].includes(params[1])) {
            if (params[1] == "on") {
                const index = this.playersDisabled.indexOf(params[0]);
                this.playersDisabled.splice(index, 1);
                tmc.chat(`¤info¤Playerchat for ¤white¤${params[0]} ¤info¤is now ¤white¤on!`, login);
            } else {
                this.playersDisabled.push(params[0]);
                tmc.chat(`¤info¤Playerchat for ¤white¤${params[0]} ¤info¤is now ¤white¤off!`, login);
            }
            return;
        }
        tmc.chat("¤info¤usage: ¤cmd¤//chat <on/off> ¤info¤or ¤cmd¤//chat <login> <on/off>")
    }

    async onPlayerChat(data: any) {
        if (!this.pluginEnabled) return;
        if (!this.publicChatEnabled && !tmc.admins.includes(data[1])) {
            tmc.chat("Public chat is disabled.", data[1]);
            return;
        }
        if (data[0] == 0) return;
        if (data[2].startsWith("/")) return;
        if (this.playersDisabled.includes(data[1])) {
            tmc.chat("Your chat is disabled.", data[1]);
            return;
        }
        const player = await tmc.getPlayer(data[1]);
        const nick = player.nickname.replaceAll(/\$[iwozs]/ig, "");
        const text = data[2];
        const msg = `${nick}$z$s$fff »$ff0 ${text}`;
        tmc.server.send("ChatSendServerMessage", msg);
        tmc.cli(msg);
    }
}