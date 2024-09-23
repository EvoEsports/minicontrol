import type { Player } from "@core/playermanager";
import Plugin from "@core/plugins";
import Widget from "@core/ui/widget";


export default class Checkpoints extends Plugin {
    checkpointCounter: { [key: string]: number } = {};
    widgets: { [key: string]: Widget } = {};

    async onLoad() {
        tmc.server.addListener("Trackmania.BeginMap", this.onBeginMap, this);
        tmc.server.addListener("Trackmania.EndRace", this.onHideWidget, this);
        tmc.server.addListener("TMC.PlayerConnect", this.onPlayerConnect, this);
        tmc.server.addListener("TMC.PlayerDisconnect", this.onPlayerDisconnect, this);
        tmc.server.addListener("TMC.PlayerCheckpoint", this.onPlayerCheckpoint, this);
        tmc.server.addListener("TMC.PlayerFinish", this.onPlayerFinish, this);
        tmc.server.addListener("TMC.PlayerGiveup", this.onPlayerGiveup, this);
    }

    async onStart() {
        await this.onBeginMap({});
    }

    async onUnload() {
        tmc.server.removeListener("Trackmania.BeginMap", this.onBeginMap);
        tmc.server.removeListener("Trackmania.EndRace", this.onHideWidget);
        tmc.server.removeListener("TMC.PlayerDisconnect", this.onPlayerDisconnect);
        tmc.server.removeListener("TMC.PlayerConnect", this.onPlayerConnect);
        tmc.server.removeListener("TMC.PlayerCheckpoint", this.onPlayerCheckpoint);
        tmc.server.removeListener("TMC.PlayerFinish", this.onPlayerFinish);
        tmc.server.removeListener("TMC.PlayerGiveup", this.onPlayerGiveup);
    }

    async onPlayerConnect(player: Player) {
        const login = player.login;
        this.checkpointCounter[login] = 0;
        if (!this.widgets[login]) {
            const widget = new Widget("core/plugins/widgets/checkpoints/widget.twig");
            widget.recipient = login;
            widget.pos = { x: 0, y: -74 };
            widget.size = { width: 20, height: 5 };
            widget.data = {
                totalCheckpoints: (tmc.maps.currentMap?.NbCheckpoints || 0) - 1,
                currentCheckpoint: this.checkpointCounter[login] || 0,
            };
            this.widgets[login] = widget;
            await widget.display();
        }
    }


    async onPlayerDisconnect(player: Player) {
        const login = player.login;
        if (this.widgets[login]) {
            delete this.widgets[login];
        }
    }

    async onHideWidget(data: any) {
        const players = tmc.players.getAll();
        for (const player of players) {
            if (this.widgets[player.login]) {
                await this.widgets[player.login].hide();
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
        this.checkpointCounter[data[0]] = parseInt(data[2])+1;
        if (this.checkpointCounter[data[0]] < (tmc.maps.currentMap?.NbCheckpoints || 0)) {
            await this.displayWidget(data[0]);
        }
    }

    async onPlayerFinish(data: any) {
        this.checkpointCounter[data[0]] = 0;
        await this.displayWidget(data[0]);
    }

    async onPlayerGiveup(data: any) {
        this.checkpointCounter[data[0]] = 0;
        await this.displayWidget(data[0]);
    }

    async displayWidget(login: string) {
        if (!this.widgets[login]) {
            const player = await tmc.getPlayer(login);
            await this.onPlayerConnect(player);
        }
        this.widgets[login].data = {
            totalCheckpoints: (tmc.maps.currentMap?.NbCheckpoints || 0) - 1,
            currentCheckpoint: this.checkpointCounter[login] || 0,
        };
        await this.widgets[login].display();
    }
}
