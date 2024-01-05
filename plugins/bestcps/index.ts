import fs from 'fs';
import tm from 'tm-essentials';
import Plugin from 'core/plugins';

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
    template: string = "";

    async onLoad() {
        this.id = tmc.ui.uuid();
        this.template = fs.readFileSync(import.meta.dir + "/templates/widget.twig").toString('utf-8');                
        tmc.server.on("Trackmania.BeginMap", this.beginMap.bind(this));
        tmc.server.on("TMC.PlayerCheckpoint", this.checkpoint.bind(this));
        const info = tmc.maps.currentMap;
        this.nbCheckpoints = info?.NbCheckpoints||-1;
        this.reset();
        await this.display();
    }

    async onUnload() {
        tmc.server.removeListener("Trackmania.BeginMap", this.beginMap.bind(this));
        tmc.server.removeListener("TMC.PlayerCheckpoint", this.checkpoint.bind(this));
        tmc.ui.hide(this.id);
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
        if (this.bestTimes[nb] && time < this.bestTimes[nb].time) {
            this.bestTimes[nb] = { nickname: (await tmc.getPlayer(login)).nickname, time: time, prettyTime: tm.Time.fromMilliseconds(time).toTmString() };
            this.display();
        }
       
    }

    async beginMap(data: any) {
        this.nbCheckpoints = Number.parseInt(data[0].NbCheckpoints);
        this.reset();
        this.display();
    }

    async display() {
        const xml = tmc.ui.render(this.template, {
            id: this.id,
            checkpoints: this.bestTimes
        });
        tmc.ui.display(xml);
    }
}