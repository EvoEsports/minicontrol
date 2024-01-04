import fs from 'fs';
import tm from 'tm-essentials';

interface Time {
    nickname: string;
    time: number;
    prettyTime: string;
}

class BesCpPlugin {
    id: string;
    bestTimes: Time[] = [];
    nbCheckpoints: number = -1;
    maxCp: number = 16;
    template: string;

    constructor() {
        this.id = tmc.ui.uuid();
        this.template = fs.readFileSync(__dirname + "/templates/widget.twig").toString('utf-8');

        tmc.server.on("TMC.Init", this.onInit.bind(this));
        tmc.server.on("Trackmania.BeginMap", this.beginMap.bind(this));
        tmc.server.on("TMC.PlayerCheckpoint", this.checkpoint.bind(this));
        tmc.server.on("TMC.PlayerFinish", this.finish.bind(this));
    }

    async onInit() {
        const info = tmc.maps.currentMap;
        this.nbCheckpoints = info?.NbCheckpoints||-1;
        this.reset();
        await this.display();
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

    async finish(data: any) {

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

tmc.addPlugin("bestCps", new BesCpPlugin);