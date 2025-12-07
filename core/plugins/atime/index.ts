import { formatTime } from "@core/utils";
import Plugin from "../index";

export default class ATime extends Plugin {
    origTAlimit = process.env["TALIMIT"];

    async onLoad() {
        tmc.settings.register("atime.multiplier", -1.0, this.setMultiplier.bind(this), "AuthorTime: Multiplier for the timelimit $z(disable: -1)");
        tmc.settings.register("atime.min", 180, null, "AuthorTime: Minimum timelimit in seconds");
        tmc.settings.register("atime.max", 600, null, "AuthorTime: Maximum timelimit in seconds");
        tmc.server.addListener("Trackmania.BeginMap", this.onBeginMap, this);
    }

    async onStart() {
        await this.onBeginMap(null);
    }

    async onUnload() {
        process.env["TALIMIT"] = this.origTAlimit;
        tmc.server.removeListener("Trackmania.BeginMap", this.onBeginMap);
    }

    async setMultiplier(value: number) {
        if (value < 1) {
            tmc.storage["minicontrol.taTimeLimit"] = Number.parseInt(process.env["TALIMIT"] || "300");
        }
    }

    async onBeginMap(_data: any) {
        if (!tmc.maps.currentMap) return;
        const multiply = tmc.settings.get("atime.multiplier") || 0;
        if (multiply < 1) return;
        let newLimit = Math.round((tmc.maps.currentMap.GoldTime / 1000) * multiply);
        const min = tmc.settings.get("atime.min") || 180;
        const max = tmc.settings.get("atime.max") || 600;

        if (newLimit < min) newLimit = min;
        if (newLimit > max) newLimit = max;
        tmc.storage["minicontrol.taTimeLimit"] = newLimit;

        const time = formatTime(newLimit * 1000);
        const goldTime = formatTime(tmc.maps.currentMap.GoldTime);
        try {
            if (tmc.game.Name === "TmForever") {
                tmc.server.send("SetTimeAttackLimit", newLimit * 1000);
                tmc.chat(`¤info¤Timelimit set to ¤white¤${time} ¤info¤(¤white¤${multiply} x ${goldTime}¤info¤)`);
                return;
            }

            if (tmc.game.Name === "Trackmania" || tmc.game.Name === "ManiaPlanet") {
                const settings = { S_TimeLimit: newLimit };
                tmc.server.send("SetModeScriptSettings", settings);
                tmc.chat(`¤info¤Timelimit set to ¤white¤${time} ¤info¤(¤white¤${multiply} x ${goldTime}¤info¤)`);
                return;
            }
        } catch (e: any) {
            tmc.chat(`¤error¤${e.message}`);
        }
    }
}
