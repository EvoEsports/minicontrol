import tm from 'tm-essentials';
import MapsWindow from './mapsWindow';
import { escape } from 'core/utils';

const pageLength = 20;

export class MapsPlugin {
    windos: any = {};

    async onLoad() {      
        tmc.addCommand("/maps", this.cmdMaps.bind(this), "Display maps list");
        tmc.addCommand("/list", this.cmdMaps.bind(this), "Display maps list");
    }

    async onUnload() {
        tmc.removeCommand("/maps");
        tmc.removeCommand("/list");

    }


    async cmdMaps(login: any, args: string[]) {
        const window = new MapsWindow(login);
        const maps = [];
        let i = 1;
        for (const map of tmc.maps.get()) {
            maps.push(
                Object.assign(map, {
                    Index: i++,
                    Name: escape(map.Name),
                    Author: map.AuthorNickname ? map.AuthorNickname : map.Author,
                    GoldTime: tm.Time.fromMilliseconds(map.GoldTime).toTmString()
                })
            );
        }
        window.title = "Maps (" + maps.length + ")";
        window.size = { width: 180, height: 95 };
        window.setItems(maps);
        window.setColumns([
            { key: "Index", title: "#", width: 4 },
            { key: "Name", title: "Name", width: 50 },
            { key: "Author", title: "Author", width: 30 },
            { key: "Environnement", title: "Environment", width: 25 },
            { key: "GoldTime", title: "Gold Time", width: 25 }
        ]);

        if (tmc.admins.includes(login)) {
            window.setActions(["Jump", "Remove"]);
        }
        
        await window.display()
    }
}