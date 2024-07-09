import tm from 'tm-essentials';
import MapsWindow from './mapsWindow';
import Plugin from "..";

export default class Maps extends Plugin {

    async onLoad() {
        tmc.addCommand("/list", this.cmdMaps.bind(this), "Display maps list");
    }

    async onUnload() {
        tmc.removeCommand("/list");
        tmc.storage["menu"]?.removeItem("Map List");
    }

    async onStart() {
        tmc.storage["menu"]?.addItem({
            category: "Map",
            title: "Map List",
            action: "/list"
        });
    }

    async cmdMaps(login: any, params: string[]) {
        const window = new MapsWindow(login, params);
        window.size = { width: 155, height: 95 };
        if (tmc.plugins['database']) {
            window.setColumns([
                { key: "Index", title: "#", width: 4 },
                { key: "Name", title: "Name", width: 50, action: "Queue" },
                { key: "Author", title: "Author", width: 30 },
                { key: "Environnement", title: "Environment", width: 15 },
                { key: "Vehicle", title: "Vehicle", width: 15 },
                { key: "ATime", title: "Author Time", width: 20 }
            ]);
        } else {
            window.setColumns([
                { key: "Index", title: "#", width: 4 },
                { key: "Name", title: "Name", width: 50, action: "Queue" },
                { key: "Author", title: "Author", width: 30 },
                { key: "Environnement", title: "Environment", width: 15 },
                { key: "ATime", title: "Author Time", width: 20 }
            ]);
        }
        window.title = "Maps [" + tmc.maps.getMapCount() + "]";
        if (tmc.admins.includes(login)) {
            window.setActions(["Delete"]);
        }

        await window.display()
    }
}