import type IWindow from "./interfaces/iwindow";
import Manialink from "./manialink";
import DefaultWindow from "./components/Window";
import { createElement, getComponent } from "./forge";

export default class Window extends Manialink implements IWindow {
    type: string = "";
    title: string = "Window";

    constructor(jsxComponent: any, login: string, type: string) {
        super("");
        this.recipient = login;
        this.type = type;
        this.data.windowType = type;
        this.actions.close = tmc.ui.addAction(() => this.destroy(), null);
        this.setDraggable(true);
        this.constructWindow(jsxComponent);
    }

    setDraggable(draggable: boolean) {
        this.data.draggable = draggable;
    }

    private constructWindow(jsxComponent: any) {
        const Window = getComponent('Window', DefaultWindow);
        this._jsxComponent = () => Window({
            pos: `${this.pos.x} ${this.pos.y}`,
            size: `${this.size.width} ${this.size.height}`,
            title: this.title,
            "z-index": this.pos.z,
            children: createElement(jsxComponent, {})
        });
    }

    async hide() {
        await this.destroy();
    }

    async destroy() {
        const xml = `
<?xml version="1.0" encoding="utf-8"?>
<manialinks>
    <manialink id="windowCleaner" name="window cleaner" layer="normal">
        <script><!--
            main() {
                declare Text[] G_MC_ActiveWindow for UI;
                declare Vec2[Text] G_MC_WindowLocations for UI;
                G_MC_ActiveWindow.remove("${this.id}");
                G_MC_WindowLocations.removekey("${this.data.windowType}");
            }
        --></script>
    </manialink>
</manialinks>`;
        await tmc.server.call('SendDisplayManialinkPageToLogin', this.recipient, xml, 500, false);
        super.destroy();
    }


}