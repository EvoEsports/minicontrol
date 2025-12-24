import Plugin from "@core/plugins";
import Manialink from "@core/ui2/manialink";
import WidgetSettings from "./widgets";
import { sleep } from "@core/utils";

export default class WidgetPlugin extends Plugin {
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

    async cmdMove(login: string) {
        await this.setDraggable(login, true);
        tmc.chat(login, "All widgets have been unlocked. You can now move them around.");
    }

    async cmdLock(login: string) {
        await this.setDraggable(login, false);
        tmc.chat(login, "All widgets have been locked. You can no longer move them around.");
    }

}
