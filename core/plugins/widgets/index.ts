import Plugin from "@core/plugins";

export default class WidgetPlugin extends Plugin {
    async onLoad() {
        this.addSetting("widgets.performance", 35, null, "Enables performance mode when player count is above this value");
    }
}
