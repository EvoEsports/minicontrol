import tm from 'tm-essentials';
import fs from 'fs';
interface Time {
    login: string;
    time: number;
}

class MapWidget {
    id: string;
    bestTimes: Time[] = [];
    nbCheckpoints: number = -1;
    action: number;
    template = "";

    constructor() {
        this.id = tmc.ui.uuid();
        this.action = tmc.ui.addAction(this.buttonClick.bind(this), null);
        this.template = fs.readFileSync(__dirname + "/templates/info.twig", "utf8").toString();
        tmc.server.on("TMC.Init", this.onInit.bind(this));
        tmc.server.on("Trackmania.BeginMap", this.beginMap.bind(this));
    }

    async onInit() {
        const info = await tmc.server.call("GetCurrentMapInfo");
        this.nbCheckpoints = info.NbCheckpoints;
        await this.display([info]);
    }

    async beginMap(data: any) {        
        this.display(data);
    }

    async display(data: any) {
        data = data[0];
        const file = tmc.ui.render(this.template, {
            id: this.id,
            action: this.action,
            author: data.AuthorNickname ? data.AuthorNickname : data.Author,
            mapname: data.Name,
            authortime: tm.Time.fromMilliseconds(data.AuthorTime).toTmString()
        });
        tmc.ui.display(file);
    }

    async buttonClick(login: string, data: any) {
        tmc.server.emit("Trackmania.PlayerChat", [1, login, "/maps"]);
    }
}

tmc.addPlugin("mapWidget", new MapWidget);