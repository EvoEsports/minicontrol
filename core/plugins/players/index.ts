import Plugin from "@core/plugins";
import PlayerWindow from "./PlayerWindow";
import { htmlEntities } from "@core/utils";
import Menu from "@core/menu";

declare module "@core/plugins" {
    interface PluginRegistry {
        "players": Players;
    }
}
export default class Players extends Plugin {
    async onLoad() {
        this.addCommand("/players", this.cmdPlayers.bind(this), "Show players");
    }

    async onStart() {
        Menu.getInstance().addItem({
            category: "Players",
            title: "Players List",
            action: "/players",
        });
    }

    async cmdPlayers(login: any, _args: string[]) {
        const window = new PlayerWindow(login);
        window.display();
    }
}
