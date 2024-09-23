import { formatTime } from '@core/utils'
import Plugin from '../index';

export default class ATime extends Plugin {
    static depends: string[] = [];
    multiply: number = parseFloat(process.env["ATIME"] || "-1") || -1;
    origTAlimit = process.env['TALIMIT'];

    async onLoad() {
        if (this.multiply <= 0) return;
        tmc.server.addListener("Trackmania.BeginMap", this.onBeginMap, this);
    }

    async onStart() {
        if (this.multiply <= 0) return;
        await this.onBeginMap(null);
    }

    async onUnload() {
        process.env['TALIMIT'] = this.origTAlimit;
        tmc.server.removeListener("Trackmania.BeginMap", this.onBeginMap);
    }

    async onBeginMap(data: any) {
        if (!tmc.maps.currentMap) return;
        let newLimit = Math.round((tmc.maps.currentMap.GoldTime / 1000) * this.multiply);
        const min = parseInt(process.env['ATIME_MIN'] || "180") || 180;
        const max = parseInt(process.env['ATIME_MAX'] || "600") || 600;

        if (newLimit < min) newLimit = min;
        if (newLimit > max) newLimit = max;
        process.env['TALIMIT'] = newLimit.toString();

        const time = formatTime(newLimit * 1000);
        const goldTime = formatTime(tmc.maps.currentMap.GoldTime);
        try {
            if (tmc.game.Name == "TmForever") {
                tmc.server.send("SetTimeAttackLimit", newLimit * 1000);
                tmc.chat(`¤info¤Timelimit set to ¤white¤${time} ¤info¤(¤white¤${this.multiply} * ${goldTime}¤info¤)`);
                return;
            }

            if (tmc.game.Name == "Trackmania" || tmc.game.Name == "ManiaPlanet") {
                const settings = { "S_TimeLimit": newLimit };
                tmc.server.send("SetModeScriptSettings", settings);
                tmc.chat(`¤info¤Timelimit set to ¤white¤${time} ¤info¤(¤white¤${this.multiply} * ${goldTime}¤info¤)`);
                return;
            }
        } catch (e: any) {
            tmc.chat("¤error¤" + e.message);
        }
    }
}