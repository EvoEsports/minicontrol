import { generateHeapSnapshot } from "bun";
import { memInfo } from "core/utils";
import Plugin from "core/plugins";

export default class DebugToo extends Plugin {
    id: string = "";
    intervalId: NodeJS.Timeout | null = null;
    

    async onLoad() {
        this.id = tmc.ui.uuid();
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
        tmc.ui.hide(this.id);
    }


    async cmdHeap(login: string, args: string[]) {
        const snapshot = generateHeapSnapshot();
        await Bun.write("./heap.heapsnapshot", JSON.stringify(snapshot, null, 4));
        tmc.chat("¤info¤Heap snapshot written to ¤white¤heap.heapsnapshot", login);
    }

    async displayMemInfo() {
        const mem = memInfo();
        const xml = `
            <manialink id="${this.id}" version="3">
                <label pos="159 -70" z-index="1" size="120 6" text="$s${mem}" textsize="1" halign="right" valign="center" />
            </manialink>`;
        tmc.cli("¤info¤Memory usage: " + mem);
        tmc.ui.display(xml);
    }
}