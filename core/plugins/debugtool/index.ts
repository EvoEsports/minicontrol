import { memInfo, processColorString, startValueMem } from "@core/utils";
import Plugin from "@core/plugins";
import tm from "tm-essentials";
import Widget from "@core/ui/widget";

interface Counters {
    methodsSend: number;
    methodsReceive: number;
    callbackReceived: number;
    sendKbsec: number;
    receiverKbSec: number;
}

export default class DebugTool extends Plugin {
    memoryWidget: Widget | null = null;
    gbxWidget: Widget | null = null;
    intervalId: any = null;

    async onLoad() {
        if (process.env.DEBUG_GBX_COUNTERS === "true") {
            this.gbxWidget = new Widget("core/plugins/debugtool/widget.xml.twig");
            this.gbxWidget.pos = { x: 159, y: -85, z: 0 };
            tmc.server.addListener("GbxClient.Counters", this.onCounters, this);
        }

        if (process.env.DEBUG === "true") {
            this.memoryWidget = new Widget("core/plugins/debugtool/widget.xml.twig");
            this.memoryWidget.pos = { x: 159, y: -60, z: 0 };

            if (tmc.game.Name !== "TmForever") {
                tmc.addCommand("//addfake", this.cmdFakeUsers.bind(this), "Connect Fake users");
                tmc.addCommand("//removefake", this.cmdRemoveFakeUsers.bind(this), "Connect Fake users");
            }
            this.intervalId = setInterval(() => {
                this.displayMemInfo();
            }, 30000) as any;
        }
        tmc.addCommand("//mem", this.cmdMeminfo.bind(this), "Show Memory usage");
        tmc.addCommand("//uptime", this.cmdUptime.bind(this), "Show Uptime");
        tmc.addCommand(
            "//gc",
            async (login: string) => {
                if (gc) {
                    tmc.chat("¤info¤Running garbage collector...", login);
                    gc();
                } else {
                    tmc.chat("¤error¤Garbage collector is not available", login);
                }
            },
            "Run garbage collector",
        );

        setInterval(() => {
            const currentMem = process.memoryUsage().rss / 1048576;
            const diff = currentMem - startValueMem;
            if (diff > 350) {
                const msg = `Stopping MINIcontrol, Memory usage is too high: $fff${currentMem.toFixed(2)}MB ¤error¤(${diff.toFixed(2)}MB)`;
                console.log(msg);
                tmc.chat(msg);
                process.exit(1);
            }
        }, 10000);
    }

    async onStart() {
        await this.displayMemInfo();
    }

    async onCounters(counters: Counters) {
        if (this.gbxWidget) {
            const msg = `¤info¤Methods Sent: $fff${counters.methodsSend} ¤info¤Received: $fff${counters.methodsReceive} ¤info¤Callbacks: $fff${counters.callbackReceived}\n¤info¤Data Send: $fff${counters.sendKbsec.toFixed(2)}kb/s ¤info¤Data Receive: $fff${counters.receiverKbSec.toFixed(2)}kb/s`;
            this.gbxWidget.setData({ text: processColorString(msg) });
            await this.gbxWidget.display();
        }
    }

    async onUnload() {
        clearInterval(this.intervalId);
        tmc.removeCommand("//mem");
        tmc.removeCommand("//uptime");
        tmc.removeCommand("//addfake");
        tmc.removeCommand("//removefake");
        this.memoryWidget?.destroy();
        this.memoryWidget = null;
    }

    async cmdRemoveFakeUsers(_login: string, _args: string[]) {
        tmc.server.send("DisconnectFakePlayer", "*");
    }

    async cmdFakeUsers(_login: string, args: string[]) {
        let count = Number.parseInt(args[0]) || 1;
        if (count > 100) count = 100;
        if (count < 1) count = 1;
        for (let i = 0; i < count; i++) {
            tmc.server.send("ConnectFakePlayer");
        }
    }

    async cmdMeminfo(login: string, _args: string[]) {
        const mem = memInfo();
        tmc.chat(`¤info¤Memory usage: ${mem}`, login);
    }

    async cmdUptime(login: string, _args: string[]) {
        const diff = Date.now() - tmc.startTime;
        tmc.chat(
            `¤info¤Uptime: ¤white¤${tm.Time.fromMilliseconds(diff)
                .toTmString()
                .replace(/[.]\d{3}/, "")}`,
            login,
        );
    }

    async displayMemInfo() {
        const mem = memInfo();
        const start = Date.now() - tmc.startTime;
        tmc.cli(
            `¤info¤Memory usage: $fff${mem} ¤info¤uptime: ¤white¤${tm.Time.fromMilliseconds(start)
                .toTmString()
                .replace(/[.]\d{3}/, "")}`,
        );
        if (this.memoryWidget) {
            this.memoryWidget.setData({ text: mem });
            await this.memoryWidget.display();
        }
    }
}
