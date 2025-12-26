import Plugin from "@core/plugins";
import WidgetButton from "./WidgetButton";
import Widget from "@core/ui2/widget";

declare module "@core/plugins" {
    interface PluginRegistry {
        "widgets/favourite": Favourite;
    }
}
export default class Favourite extends Plugin {
    widget?: Widget;

    async onStart() {
        this.widget = this.createWidget();
        await this.widget.display();
    }

    async onUnload() {
        this.widget?.destroy();
        this.widget = undefined;
    }

    createWidget() {
        const widget = new Widget(() => WidgetButton({
            size: "10 10",
            link: `http://reaby.kapsi.fi/trackmania/favourite.php?server=${encodeURIComponent(tmc.server.login)}`
        }), "favouriteWidget");
        widget.size = { width: 10, height: 10 };
        widget.pos = { x: -138, y: 72.5, z: 0 };
        return widget;
    }
}
