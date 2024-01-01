import PlayerWindow from "./PlayerWindow";

export class PlayersPlugin {
    constructor() {
        tmc.server.on("TMC.Init", this.onInit.bind(this));
        tmc.addCommand("/players", this.cmdPlayers.bind(this));
    }

    async onInit() {
        // await this.cmdPlayers("reaby", []);
    }

    async cmdPlayers(login: any, args: string[]) {
        const window = new PlayerWindow(login);
        window.size = { width: 135, height: 100 };
        window.title = "Players";
        window.setItems(tmc.players.get());
        window.setColumns([
            { key: "nickname", title: "Nickname", width: 50 },
            { key: "login", title: "Login", width: 50 }
        ]);

        if (tmc.admins.includes(login)) {
            window.setActions(["Kick", "Ban"]);
        }

        await window.display();
    }

}

tmc.addPlugin("players", new PlayersPlugin);
