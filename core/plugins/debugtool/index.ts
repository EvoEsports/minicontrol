import { generateHeapSnapshot } from "bun";
import { memInfo } from "core/utils";
import Plugin from "core/plugins";
import tm from 'tm-essentials';
import Widget from 'core/ui/widget';

export default class DebugTool extends Plugin {
    widget: Widget | null = null;
    intervalId: NodeJS.Timeout | null = null;

    async onLoad() {
        if (process.env.DEBUG == "true") {
            this.widget = new Widget("core/plugins/debugtool/widget.twig");
            this.widget.pos = { x: 159, y: -60 };
            tmc.addCommand("//heap", this.cmdHeap.bind(this), "Log heap memory usage");
            tmc.addCommand("//addfake", this.cmdFakeUsers.bind(this), "Connect Fake users");
            tmc.addCommand("//removefake", this.cmdRemoveFakeUsers.bind(this), "Connect Fake users");         
        }
        this.displayMemInfo();     
        this.intervalId = setInterval(() => {
            this.displayMemInfo();
        }, 60000);
    }

    async onUnload() {
        clearInterval(this.intervalId!);
        tmc.removeCommand("//heap");
        this.widget?.destroy();
        this.widget = null;
    }

    async cmdRemoveFakeUsers(login: string, args: string[]) {
        tmc.server.send("DisconnectFakePlayer", "*");
    }

    async cmdFakeUsers(login: string, args: string[]) {
        const count = Number.parseInt(args[0]) || 50;     
        for (let i = 0; i < count; i++) {
            tmc.server.send("ConnectFakePlayer");
        }
    }

    async cmdHeap(login: string, args: string[]) {
        const snapshot = generateHeapSnapshot();
        await Bun.write("./heap.heapsnapshot", JSON.stringify(snapshot, null, 4));
        tmc.chat("¤info¤Heap snapshot written to ¤white¤heap.heapsnapshot", login);
    }

    async displayMemInfo() {
        const mem = memInfo();

        let start = Date.now() - Number.parseInt(tmc.startTime);
        tmc.cli("¤info¤Memory usage: " + mem + " ¤info¤uptime: $fff" + tm.Time.fromMilliseconds(start).toTmString().replace(/[.]\d{3}/, ""));
        if (this.widget) {
            this.widget.setData({ mem: mem });
            await this.widget.display();
        }
    }
}