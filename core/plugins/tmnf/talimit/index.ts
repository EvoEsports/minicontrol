import Widget from "@core/ui/widget";
import Plugin from "@core/plugins";
import tm from "tm-essentials";

declare module "@core/plugins" {
    interface PluginRegistry {
        "tmnf/talimit": TAlimitPlugin;
    }
}

export default class TAlimitPlugin extends Plugin {
    origTimeLimit: number = Number.parseInt(process.env.TALIMIT ?? "300");
    startTime: number = Date.now();
    timeLimit = 0;
    active = false;
    extend = false;
    widget: Widget | null = null;
    intervalId: any | null = null;

    async onBeginRound() {
        this.startTime = Date.now();
        const gamemode = await tmc.server.call("GetGameMode"); // Rounds (0), TimeAttack (1), Team (2), Laps (3), Stunts (4) and Cup (5)
        const warmup = await tmc.server.call("GetWarmUp");
        this.active = gamemode === 1 && !warmup;
        this.timeLimit = tmc.storage["minicontrol.taTimeLimit"] ?? this.origTimeLimit;
    }

    async onEndRound() {
        this.active = false;
        await this.hideWidget();
    }

    async onLoad() {
        this.widget = new Widget("widget.xml.twig", import.meta.dirname);
        this.widget.pos = { x: 128, y: 45, z: 1 };
        this.widget.size = { width: 38, height: 10 };
        this.timeLimit = tmc.storage["minicontrol.taTimeLimit"] ?? this.origTimeLimit;
        this.startTime = Date.now();
        this.addListener("Trackmania.BeginRound", this.onBeginRound, this);
        this.addListener("Trackmania.EndRound", this.onEndRound, this);
        const gamemode = await tmc.server.call("GetGameMode"); // Rounds (0), TimeAttack (1), Team (2), Laps (3), Stunts (4) and Cup (5)
        if (gamemode === 1) {
            const limit = await tmc.server.call("GetTimeAttackLimit");
            if (limit.CurrentValue > 0) {
                await tmc.server.send("SetTimeAttackLimit", 0);
                tmc.chat("¤info¤TALimit: TimeAttackLimit was set, disabling it.");
                tmc.server.send("NextMap");
            }
            this.active = true;
        }
        tmc.server.addOverride("SetTimeAttackLimit", this.overrideSetLimit.bind(this));
        tmc.server.addOverride("GetTimeAttackLimit", this.overrideGetLimit.bind(this));
        this.intervalId = setInterval(() => this.tick(), 1000);
    }

    async onStart() {
        this.timeLimit = tmc.storage["minicontrol.taTimeLimit"] ?? this.origTimeLimit;
    }

    async onUnload() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        tmc.server.removeOverride("SetTimeAttackLimit");
        tmc.server.removeOverride("GetTimeAttackLimit");
        this.active = false;
        await this.hideWidget();
        tmc.server.send("SetTimeAttackLimit", this.timeLimit * 1000);
        tmc.chat("¤white¤ALimit: Native TimeLimit restored, skip map required to apply.");
    }

    async tick() {
        if (this.timeLimit < 1) {
            return;
        }
        const timeLeft = 3 + this.timeLimit - (Date.now() - this.startTime) / 1000;
        if (this.active && timeLeft <= 0) {
            this.active = false;
            tmc.server.send("NextMap");
        } else if (this.active) {
            await this.showWidget();
        }
    }

    async overrideSetLimit(args: string) {
        const newlimit = Number.parseInt(args) / 1000;
        this.timeLimit = newlimit;
        await this.hideWidget();
    }

    async overrideGetLimit(_args: string) {
        return { CurrentValue: this.timeLimit * 1000, NextValue: this.timeLimit * 1000 };
    }

    async showWidget() {
        let color = "fff";
        const timeLeft = 3 + this.timeLimit - (Date.now() - this.startTime) / 1000;
        if (timeLeft < 60) color = "ff0";
        if (timeLeft < 30) color = "f00";
        const time = tm.Time.fromSeconds(timeLeft)
            .toTmString(true)
            .replace(/\.\d\d/, "");

        if (this.widget) {
            this.widget.setData({
                time: `$${color}$s${time}`,
            });
            await this.widget.display();
        }
    }

    async hideWidget() {
        await this.widget?.hide();
    }
}
