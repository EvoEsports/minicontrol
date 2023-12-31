import ListWindow from "../../core/ui/listwindow";

export class PlayersPlugin {
    constructor() {
        tmc.server.on("TMC.Init", this.onInit.bind(this));
        tmc.addCommand("/players", this.cmdPlayers.bind(this));
    }

    async onInit() {
        // await this.cmdPlayers("reaby", []);
    }

    async cmdPlayers(login: any, args: string[]) {
        const window = new ListWindow(login, 20);
        window.size = { width: 105, height: 100 };
        window.title = "Players";
        window.setItemsAndColumns(tmc.players.get(), [{ key: "nickname", title: "Nickname", width: 50 }, { key: "login", title: "Login", width: 50 }])
        await window.display();
    }

}

tmc.addPlugin("players", new PlayersPlugin);
