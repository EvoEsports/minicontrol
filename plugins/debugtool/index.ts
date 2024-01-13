import { generateHeapSnapshot } from "bun";
import { memInfo } from "core/utils";
import Plugin from "core/plugins";
import tm from 'tm-essentials';
import Widget from 'core/ui/widget';

export default class DebugTool extends Plugin {
    widget: Widget | null = null;
    intervalId: NodeJS.Timeout | null = null;

    async onLoad() {
        this.widget = new Widget("plugins/debugtool/widget.twig");
        this.widget.pos = { x: 159, y: -60 };
        if (process.env.DEBUG == "true") {
            tmc.addCommand("//heap", this.cmdHeap.bind(this), "Log heap memory usage");
        }
        this.displayMemInfo();
        this.intervalId = setInterval(() => {
            this.displayMemInfo();
        }, 5000);
    }

    async onUnload() {
        clearInterval(this.intervalId!);
        tmc.removeCommand("//heap");
        this.widget?.destroy();
        this.widget = null;
    }


    async cmdHeap(login: string, args: string[]) {
        const snapshot = generateHeapSnapshot();
        await Bun.write("./heap.heapsnapshot", JSON.stringify(snapshot, null, 4));
        tmc.chat("¤info¤Heap snapshot written to ¤white¤heap.heapsnapshot", login);
    }

    async displayMemInfo() {
        const mem = memInfo();

        let start = Date.now() - Number.parseInt(tmc.startTime);
        tmc.debug("¤info¤Memory usage: " + mem + " ¤info¤uptime: $fff" + tm.Time.fromMilliseconds(start).toTmString().replace(/[.]\d{3}/, ""));
        if (this.widget) {
            this.widget.setData({ mem: mem });
            await this.widget.display();
        }
    }
}