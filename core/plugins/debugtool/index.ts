import { memInfo, processColorString, startValueMem } from "@core/utils";
import Plugin from "@core/plugins";
import tm from "tm-essentials";
import Widget from "@core/ui/widget";
import Label from "./LabelWidget";

interface Counters {
    methodsSend: number;
    methodsReceive: number;
    callbackReceived: number;
    sendKbsec: number;
    receiverKbSec: number;
}

declare module "@core/plugins" {
    interface PluginRegistry {
        "debugtool": DebugTool;
    }
}

export default class DebugTool extends Plugin {
    memoryWidget: Widget | null = null;
    gbxWidget: Widget | null = null;

    async onLoad() {
        this.addSetting("debugtool.enableGbxCounters", false, async (value: boolean) => {
            if (!value && this.gbxWidget) {
                await this.gbxWidget.hide();
            } else {
                await this.gbxWidget?.display();
            }
        }, "DebugTool: Enable GBX Client Counters widget");
        this.addSetting("debugtool.enableMemoryWidget", false, async (value: boolean) => {
            if (!value && this.memoryWidget) {
                await this.memoryWidget.hide();
            }
        }, "DebugTool: Enable Memory Usage widget");

        this.gbxWidget = new Widget(Label, "gbxCounters");
        this.gbxWidget.pos = { x: 159, y: -85, z: 0 };
        this.addListener("GbxClient.Counters", this.onCounters, this);

        this.memoryWidget = new Widget(Label, "memoryUsage");
        this.memoryWidget.pos = { x: 159, y: -60, z: 0 };

        if (tmc.game.Name !== "TmForever") {
            this.addCommand("//addfake", this.cmdFakeUsers.bind(this), "Connect Fake users");
            this.addCommand("//removefake", this.cmdRemoveFakeUsers.bind(this), "Connect Fake users");
        }

        this.addCommand("//mem", this.cmdMeminfo.bind(this), "Show Memory usage");
        this.addCommand("//uptime", this.cmdUptime.bind(this), "Show Uptime");
        this.addCommand(
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
    }

    async onStart() {
        await this.displayMemInfo();
        this.watchDog();
    }

    private async watchDog() {
        const currentMem = process.memoryUsage().rss / 1048576;
        const diff = currentMem - startValueMem;
        if (diff > 450) {
            const msg = `Stopping MINIcontrol, Memory usage is too high: $fff${currentMem.toFixed(2)}MB ¤error¤(${diff.toFixed(2)}MB)`;
            console.log(msg);
            tmc.chat(msg);
            process.exit(1);
        }
        setTimeout(() => this.watchDog(), 10 * 1000);
    }

    async onCounters(counters: Counters) {
        if (tmc.settings.get("debugtool.enableGbxCounters") && this.gbxWidget) {
            const msg = `¤info¤Methods Sent: $fff${counters.methodsSend} ¤info¤Received: $fff${counters.methodsReceive} ¤info¤Callbacks: $fff${counters.callbackReceived}\n¤info¤Data Send: $fff${counters.sendKbsec.toFixed(2)}kb/s ¤info¤Data Receive: $fff${counters.receiverKbSec.toFixed(2)}kb/s`;
            this.gbxWidget.setData({ text: processColorString(msg) });
            await this.gbxWidget.display();
        }
    }

    async onUnload() {
        this.memoryWidget?.destroy();
        this.gbxWidget?.destroy();
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
        setTimeout(() => this.displayMemInfo(), 30 * 1000);
        if (!tmc.settings.get("debugtool.enableMemoryWidget")) {
            return;
        }
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
