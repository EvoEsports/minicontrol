import type { Player } from "@core/playermanager";
import Plugin from "@core/plugins";

export default class MyPlugin extends Plugin {
    static depends: string[] = [];

    async onLoad() {
        tmc.server.addListener("TMC.PlayerConnect", this.onPlayerConnect, this);
    }

    async onUnload() {
        tmc.server.removeListener("TMC.PlayerConnect", this.onPlayerConnect);
    }

    async onPlayerConnect(player: Player) {
        tmc.chat("Welcome to the server " + player.nickname + "!");
    }

}

