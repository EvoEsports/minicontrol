import type { Player } from "@core/playermanager";
import Plugin from "@core/plugins";
import Widget from "@core/ui/widget";
import Label from "@core/ui/components/partials/Label";

declare module "@core/plugins" {
    interface PluginRegistry {
        "widgets/checkpoints": Checkpoints;
    }
}

export default class Checkpoints extends Plugin {
    checkpointCounter: { [key: string]: number } = {};
    widgets: { [key: string]: Widget } = {};

    async onLoad() {
        this.addListener("Trackmania.BeginMap", this.onBeginMap, this);
        this.addListener("Trackmania.EndRace", this.onHideWidget, this);
        this.addListener("TMC.PlayerConnect", this.onPlayerConnect, this);
        this.addListener("TMC.PlayerDisconnect", this.onPlayerDisconnect, this);
        this.addListener("TMC.PlayerCheckpoint", this.onPlayerCheckpoint, this);
        this.addListener("TMC.PlayerFinish", this.onPlayerFinish, this);
        this.addListener("TMC.PlayerGiveup", this.onPlayerGiveup, this);
    }

    async onStart() {
        await this.onBeginMap({});
    }

    async onUnload() {
        for (const login in this.widgets) {
            await this.widgets[login].destroy();
        }
        this.widgets = {};
    }

    async onPlayerConnect(player: Player) {
        const login = player.login;
        this.checkpointCounter[login] = 0;
        if (!this.widgets[login]) {
            const widget = new Widget(() => Label({
                scale: "1.2",
                halign: "center",
            }), "checkpointsWidget");
            widget.recipient = login;
            widget.pos = { x: 0, y: -74, z: 0 };
            widget.size = { width: 20, height: 5 };
            const text = (tmc.maps.currentMap?.NbCheckpoints || 0) - 1 + " / " + (this.checkpointCounter[login] || 0);
            widget.data = {
                text
            };
            this.widgets[login] = widget;
            widget.display();
        }
    }

    async onPlayerDisconnect(player: Player) {
        const login = player.login;
        if (this.widgets[login]) {
            delete this.widgets[login];
        }
    }

    async onHideWidget(data: any) {
        const minPlayers = tmc.settings.get("widgets.performance");
        const logins = tmc.players.getAllLogins();
        if (logins.length >= minPlayers) return;
        for (const login of logins) {
            if (this.widgets[login]) {
                await this.widgets[login].hide();
            }
        }
    }

    async onBeginMap(data: any) {
        this.checkpointCounter = {};
        const players = tmc.players.getAll();
        for (const player of players) {
            this.checkpointCounter[player.login] = 0;
            await this.onPlayerConnect(player);
        }
    }

    async onPlayerCheckpoint(data: any) {
        this.checkpointCounter[data[0]] = Number.parseInt(data[2]) + 1;
        if (this.checkpointCounter[data[0]] < (tmc.maps.currentMap?.NbCheckpoints || 0)) {
            await this.displayWidget(data[0]);
        }
    }

    async onPlayerFinish(data: any) {
        this.checkpointCounter[data[0]] = 0;
        await this.displayWidget(data[0]);
    }

    async onPlayerGiveup(data: any) {
        this.checkpointCounter[data[0].toString()] = 0;
        await this.displayWidget(data[0]);
    }

    async displayWidget(login: string) {
        const minPlayers = tmc.settings.get("widgets.performance");
        if (tmc.players.getAllLogins().length >= minPlayers) return;

        if (!this.widgets[login]) {
            const player = await tmc.getPlayer(login);
            await this.onPlayerConnect(player);
        }
        const text = (tmc.maps.currentMap?.NbCheckpoints || 0) - 1 + " / " + (this.checkpointCounter[login] || 0);
        this.widgets[login].data = {
            text
        };
        await this.widgets[login].display();
    }
}
