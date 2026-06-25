import Confirm from "@core/ui/confirm";
import ListWindow from "@core/ui/listwindow";

export default class PlayerWindow extends ListWindow {
    size = { width: 195, height: 120 };
    title = "Players";

    constructor(login: string) {
        super(login, "playersWindow");

        this.setColumns({
            nickname: { title: "Nickname", width: 50 },
            login: { title: "Login", width: 50, actionKey: "getLogin" },
            path: { title: "Path", width: 50 },
        });

        if (tmc.game.Name !== "TmForever") this.setAction("getLogin", "Copy Login", async (login, item, entries) => {
            tmc.ui.setClipboard(login, item.login);
            tmc.chat("¤info¤Login copied to clipboard", login);
        });

        if (tmc.admins.includes(login)) {
            this.setAction("mute", "Mute", async (login, item, entries) => {
                await tmc.chatCmd.execute(login, `//togglemute ${item.login}`);
            });
            this.setAction("kick", "Kick", async (login, item, entries) => {
                const confirm = new Confirm(login, `Kick ${item.nickname}`, this.applyCommand.bind(this), [login, `//kick ${item.login}`]);
                await confirm.display();
            });
            this.setAction("ban", "Ban", async (login, item, entries) => {
                const confirm = new Confirm(login, `Ban ${item.nickname}`, this.applyCommand.bind(this), [login, `//ban ${item.login}`]);
                await confirm.display();
            });
        }
    }

    async display() {
        const players: any = [];
        for (const player of tmc.players.getAll()) {
            players.push({
                nickname: player.nickname,
                login: player.login,
                path: player.path,
            });
        }
        this.setItems(players);
        await super.display();
    }


    async applyCommand(login: string, action: string) {
        await tmc.chatCmd.execute(login, action);
        await this.display();
    }
}
