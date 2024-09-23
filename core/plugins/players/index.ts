import Plugin from "@core/plugins";
import PlayerWindow from "./PlayerWindow";


export default class Players extends Plugin {

    async onLoad() {
        tmc.addCommand("/players", this.cmdPlayers.bind(this), "Show players");
    }

    async onUnload() {
        tmc.removeCommand("/players");
        tmc.storage["menu"]?.removeItem("Players");
    }

    async onStart() {
        if (tmc.storage["menu"]) {
            tmc.storage["menu"].addItem({
                category: "Players",
                title: "Players List",
                action: "/players"
            });
        }
    }

    async cmdPlayers(login: any, args: string[]) {
        const window = new PlayerWindow(login);
        window.size = { width: 195, height: 95 };
        window.title = "Players";
        window.setItems(tmc.players.getAll());
        window.setColumns([
            { key: "nickname", title: "Nickname", width: 50 },
            { key: "login", title: "Login", width: 50, type:"entry" },
            { key: "path", title: "Path", width: 50 }
        ]);

        if (tmc.admins.includes(login)) {
            window.setActions(["Mute", "Kick", "Ban"]);
        }

        await window.display();
    }
}