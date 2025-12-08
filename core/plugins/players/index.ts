import Plugin from "@core/plugins";
import PlayerWindow from "./PlayerWindow";
import { htmlEntities } from "@core/utils";
import Menu from "@core/menu";

export default class Players extends Plugin {
    async onLoad() {
        this.addCommand("/players", this.cmdPlayers.bind(this), "Show players");
    }

    async onUnload() {

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
        window.size = { width: 195, height: 95 };
        window.title = "Players";
        const players: any = [];
        for (const player of tmc.players.getAll()) {
            players.push({
                nickname: htmlEntities(player.nickname),
                login: player.login,
                path: htmlEntities(player.path),
            });
        }
        window.setItems(players);
        window.setColumns([
            { key: "nickname", title: "Nickname", width: 50 },
            { key: "login", title: "Login", width: 50, action: "getLogin" },
            { key: "path", title: "Path", width: 50 },
        ]);

        if (tmc.admins.includes(login)) {
            window.setActions(["Mute", "Kick", "Ban"]);
        }

        window.display();
    }
}
