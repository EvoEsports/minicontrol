import tm from 'tm-essentials';
import ListWindow from '../../core/ui/listwindow';

const pageLength = 20;

export class MapsPlugin {
    windos: any = {};

    constructor() {
        tmc.server.on("TMC.Init", this.onInit.bind(this));
        tmc.addCommand("/maps", this.cmdMaps.bind(this));
        tmc.addCommand("/list", this.cmdMaps.bind(this));
    }

    async onInit() {
        // await this.cmdMaps("reaby", []);
    }

    async cmdMaps(login: any, args: string[]) {
        const window = new ListWindow(login, 20);
        window.size = { width: 140, height: 100 };
        window.title = "Maps";
        const maps = [];
        let i = 1;
        for (const map of tmc.maps.get()) {
            maps.push(
                Object.assign(map, {
                    Index: i++,
                    Author: map.AuthorNickName ? map.AuthorNickName : map.Author,
                    GoldTime: tm.Time.fromMilliseconds(map.GoldTime).toTmString()
                })
            );
        }
        window.setItemsAndColumns(maps, [
            { key: "Index", title: "#", width: 4 },
            { key: "Name", title: "Name", width: 50 },
            { key: "Author", title: "Author", width: 30 },
            { key: "Environnement", title: "Environment", width: 25 },
            { key: "GoldTime", title: "Gold Time", width: 25 }
        ]);
        await window.display()
    }
}

tmc.addPlugin("maps", new MapsPlugin);