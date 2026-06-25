import Plugin from "@core/plugins";
import Manialink from "@core/ui/manialink";
import Script from "./script";

export default class WorldRecords extends Plugin {
    widget!: Manialink;

    async onLoad() {
        tmc.ui.setUiProperty("Race_Record", "visible", false);
    }

    async onStart() {
        tmc.ui.sendUiProperties();
        const widget = new Manialink(Script);
        widget.size = { width: 38, height: 40 };
        widget.pos = { x: -159, y: 35, z: 0 };
        widget.show();
        this.widget = widget;
    }

}


