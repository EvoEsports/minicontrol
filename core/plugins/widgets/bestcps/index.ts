import tm from 'tm-essentials';
import Plugin from '@core/plugins';
import Widget from '@core/ui/widget';
import { formatTime, removeColors } from '@core/utils';

interface Time {
    nickname: string;
    time: number;
    prettyTime: string;
}

export default class BestCps extends Plugin {
    id: string = "";
    bestTimes: Time[] = [];
    nbCheckpoints: number = -1;
    maxCp: number = 16;
    widget: Widget | null = null;

    async onLoad() {
        tmc.server.addListener("Trackmania.BeginMap", this.beginMap, this);
        tmc.server.addListener("TMC.PlayerCheckpoint", this.checkpoint, this);
        this.widget = new Widget("core/plugins/widgets/bestcps/widget.twig");
        this.widget.pos = { x: -160, y: 90 };
        this.widget.size = { width: 240, height: 20 };
        const info = tmc.maps.currentMap;
        this.nbCheckpoints = info?.NbCheckpoints || -1;
        this.reset();
        await this.display();
    }

    async onUnload() {
        tmc.server.removeListener("Trackmania.BeginMap", this.beginMap.bind(this));
        tmc.server.removeListener("TMC.PlayerCheckpoint", this.checkpoint.bind(this));
        this.widget?.destroy();
        this.widget = null;
    }

    reset() {
        this.bestTimes = [];
        for (let i = 0; i < this.nbCheckpoints; i++) {
            if (i >= this.maxCp) break;
            this.bestTimes[i] = { time: 999999999, nickname: "", prettyTime: "" };
        }
    }

    async checkpoint(data: any) {
        const login = data[0];
        const time = data[1];
        const nb = data[2];
        if (nb >= this.maxCp) return;
        if (nb >= this.nbCheckpoints - 1) return;
        if (this.bestTimes[nb] && time < this.bestTimes[nb].time) {
            this.bestTimes[nb] = { nickname: removeColors((await tmc.getPlayer(login)).nickname), time: time, prettyTime: formatTime(time) };
            await this.display();
        }

    }

    async beginMap(data: any) {
        this.nbCheckpoints = Number.parseInt(data[0].NbCheckpoints);
        this.reset();
        await this.display();
    }

    async display() {
        this.widget?.setData({
            checkpoints: this.bestTimes
        });
        this.widget?.display();
    }
}