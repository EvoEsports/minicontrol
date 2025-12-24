import Plugin from "@core/plugins";
import Menu from "@core/menu";
import MapsWindow from "./ui/MapsWindow";

declare module "@core/plugins" {
    interface PluginRegistry {
        "maps": Maps;
    }
}

export default class Maps extends Plugin {
    async onLoad() {
        this.addCommand("/list", this.cmdMaps.bind(this), "Display maps list");
        this.addListener("TMC.MapListModified", this.onMapListModified, this);

        Menu.getInstance().addItem({
            category: "Map",
            title: "Map List",
            action: "/list",
        });
    }


    async onMapListModified() {
        const windows = tmc.ui.getWindowsByName("maplist") as MapsWindow[];
        for (const window of windows) {
            await window.update();
            await window.display();
        }
    }

    /**
     *  Player command to display the map list
     * @param login
     * @param params
     */
    async cmdMaps(login: any, params: string[]) {
        const window = new MapsWindow(login, "maplist", params);
        await window.update();
        window.display();
    }
}
