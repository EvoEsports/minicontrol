import tm from 'tm-essentials';

interface Time {
    login: string;
    time: number;
}

class MapWidget {
    id: string;
    bestTimes: Time[] = [];
    nbCheckpoints: number = -1;
    action: number;

    constructor() {
        this.id = tmc.ui.uuid();
        this.action = tmc.ui.addAction(this.test_buttonClick.bind(this), "test");
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
        const file = tmc.ui.renderFile(__dirname + "/templates/info.twig", {
            id: this.id,
            action: this.action,
            author: data.AuthorNickname ? data.AuthorNickname : data.Author,
            mapname: data.Name,
            authortime: tm.Time.fromMilliseconds(data.AuthorTime).toTmString()
        });
        tmc.ui.display(file);
    }

    async test_buttonClick(login: string, data: any) {
        await tmc.chat(`${login} pressed a button. data: ${data}`);
    }
}

tmc.addPlugin("mapWidget", new MapWidget);