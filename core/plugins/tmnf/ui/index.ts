import Plugin from "@core/plugins";
import Widget from "@core/ui/widget.ts";

export default class TmnfUi extends Plugin {
    static depends: string[] = ["game:TmForever"];
    widget: Widget | null = null;

    async onLoad() {
        this.widget = new Widget("core/plugins/tmnf/ui/widget.xml.twig");
        this.widget.title = "RUN INFO";
        this.widget.pos = {x: 121, y: 75, z: -20};
        this.widget.size = {width: 38, height: 10};
        await this.widget.display();
    }

    async onUnload() {
        this.widget?.hide();
        this.widget = null;
    }

}
