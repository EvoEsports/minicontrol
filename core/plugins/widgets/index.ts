import Plugin from "@core/plugins";
import Manialink from "@core/ui2/manialink";
import WidgetSettings from "./widgets";
import Grid from "@core/ui2/components/Grid";
import Window from "@core/ui2/window";
export default class WidgetPlugin extends Plugin {
    grids: { [key: string]: Manialink } = {};
    moveTargets: { [key: string]: any } = {};

    async onLoad() {
        this.addSetting("widgets.performance", 35, null, "Enables performance mode when player count is above this value");
        this.addCommand("/move", this.cmdMove.bind(this), "Unlock all widgets positions");
        this.addCommand("/lock", this.cmdLock.bind(this), "Lock all widgets positions");
    }

    async setDraggable(login: string, draggable: boolean) {
        const widget = new Manialink(WidgetSettings);
        widget.name = "widgetSettings";
        widget.recipient = login;
        widget.displayDuration = 500;
        widget.data.draggable = draggable;
        await widget.display();
        await widget.destroy(false);
    }

    async createGrid(login: string) {
        const widget = new Manialink(() => Grid({
            pos: "-180 90",
            size: "360 180",
            divider: "36 18"
        }));

        widget.name = "widgetGrid";
        for (let y = 0; y < 18; y++) {
            for (let x = 0; x < 36; x++) {
                widget.actions[`grid_${x}_${y}`] = tmc.ui.addAction(this.move.bind(this), { x, y });
            }
        }
        widget.recipient = login;
        await widget.display();
        this.grids[login] = widget;

    }
    async move(login: string, data: { x: number, y: number }) {
        if (!this.moveTargets[login]) return;
        const manialink = tmc.ui.getManialinks(undefined).find(m => m.id === this.moveTargets[login] && m.recipient === login);
        if (!manialink) return;
        manialink.pos = { x: -180 + (data.x * 10), y: 90 - (data.y * 10), z: manialink.pos.z };
        await manialink.display();
    }


    async setMoveTarget(login: string, data: any) {
        this.moveTargets[login] = data;
    }

    async setMoveWidgets(login: string, lock: boolean = true) {

        const manialinks = tmc.ui.getManialinks(undefined).filter(m => m.recipient === login);
        for (const manialink of manialinks) {
            if (manialink.name === "widgetGrid") continue;
            if (manialink instanceof Window) continue;
            if (!lock && !manialink.actions["move"]) {
                await this.createGrid(login);
                const moveCallback = tmc.ui.addAction(this.setMoveTarget.bind(this), manialink.id);
                manialink.actions["move"] = moveCallback;
            } else {
                delete manialink.actions["move"];
            }
            await manialink.display();
        }
    }

    async cmdMove(login: string) {
        tmc.chat("¤info¤All movable widgets have been unlocked. You can now move them around.", login);
        if (tmc.game.Name === "TmForever") {
            await this.setMoveWidgets(login, false);
            return;
        }
        await this.setDraggable(login, true);
    }

    async cmdLock(login: string) {
        tmc.chat("¤info¤All widgets have been locked.", login);
        if (tmc.game.Name === "TmForever") {
            const grid = this.grids[login];
            if (grid) {
                await grid.destroy(true);
                delete this.grids[login];
            }
            await this.setMoveWidgets(login, true);
            return;
        }
        await this.setDraggable(login, false);
    }

}
