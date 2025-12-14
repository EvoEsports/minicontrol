import Plugin from "@core/plugins";
import ListWindow from "@core/ui/listwindow";
import Widget from "@core/ui/widget";
import { formatTime, htmlEntities } from "@core/utils";
import Menu from "@core/menu";

interface Time {
    nickname: string;
    time: number;
    prettyTime: string;
}

export default class BestCps extends Plugin {
    id = "";
    bestTimes: Time[] = [];
    nbCheckpoints = -1;
    maxCp = 16;
    widget: Widget | null = null;

    async onLoad() {
        this.addListener("Trackmania.BeginMap", this.beginMap, this);
        this.addListener("TMC.PlayerCheckpoint", this.checkpoint, this);
        this.addCommand("/checkpoints", this.cmdCheckpoints.bind(this), "Display best Checkpoints");
        this.widget = new Widget("widget.xml.twig", import.meta.dirname);
        this.widget.pos = { x: -160, z: 0, y: 90 };
        this.widget.size = { width: 240, height: 20 };
        const info = tmc.maps.currentMap;
        this.nbCheckpoints = info?.NbCheckpoints || -1;
        await this.display();
    }

    async onUnload() {
        this.widget?.destroy();
        this.widget = null;
    }

    async onStart() {
        const menu = Menu.getInstance();
        menu.addItem({
            category: "Records",
            title: "Live Checkpoints",
            action: "/checkpoints",
        });
    }

    async checkpoint(data: any) {
        const login = data[0];
        const time = data[1];
        const nb = data[2];
        if (!this.bestTimes[nb - 1] && nb > 0) return;
        if (!this.bestTimes[nb] || time < this.bestTimes[nb].time) {
            this.bestTimes[nb] = { nickname: htmlEntities((await tmc.getPlayer(login)).nickname), time: time, prettyTime: formatTime(time) };
            await this.display();
        }
    }

    async beginMap(data: any) {
        this.bestTimes = [];
        await this.display();
    }

    async display() {
        this.widget?.setData({
            maxCps: this.maxCp,
            checkpoints: this.bestTimes,
        });
        this.widget?.display();
    }

    async cmdCheckpoints(login: string, args: string[]) {
        if (this.bestTimes.length === 0) {
            tmc.chat("¤error¤No Checkpoints found!", login);
            return;
        }
        const checkpoints: any = [];
        let checkpointNumber = 1;
        for (const checkpoint of this.bestTimes) {
            checkpoints.push({
                checkpoint: checkpointNumber,
                nickname: checkpoint.nickname,
                time: checkpoint.prettyTime,
            });
            checkpointNumber++;
        }
        const window = new ListWindow(login);
        window.size = { width: 100, height: 100 };
        window.title = `Best Checkpoints [${this.bestTimes.length}]`;
        window.setItems(checkpoints);
        window.setColumns([
            { key: "checkpoint", title: "Checkpoint", width: 20 },
            { key: "nickname", title: "Nickname", width: 50 },
            { key: "time", title: "Time", width: 20 },
        ]);

        window.display();
    }
}
