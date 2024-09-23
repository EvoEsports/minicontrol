import { escape, formatTime } from '@core/utils';
import Plugin from '@core/plugins';
import Widget from '@core/ui/widget';

interface Time {
    login: string;
    time: number;
}

export default class MapWidget extends Plugin {
    static depends: string[] = ["maps"];
    id: string = "";
    bestTimes: Time[] = [];
    nbCheckpoints: number = -1;
    widget: Widget | null = null;

    async onLoad() {
        this.id = tmc.ui.uuid();
        this.widget = new Widget("core/plugins/widgets/map/widget.twig");
        this.widget.title ="MAP INFO";
        this.widget.pos = { x: 121, y: 90, z: 1 };
        this.widget.size = { width: 38, height: 10 };
        this.widget.setOpenAction(this.buttonClick.bind(this));
        tmc.server.addListener("Trackmania.BeginMap", this.beginMap, this);
        const info = tmc.maps.currentMap;
        this.nbCheckpoints = info?.NbCheckpoints || -1;
        await this.display([info]);
    }

    async onUnload() {
        this.widget?.hide();
        this.widget = null;
        tmc.server.removeListener("Trackmania.BeginMap", this.beginMap);
    }

    async beginMap(data: any) {
        await this.display(data);
    }

    async display(data: any) {
        data = data[0];
        this.widget?.setData({
            author: data.AuthorNickname ? data.AuthorNickname : data.Author,
            mapname: escape(data.Name),
            authortime: formatTime(data.AuthorTime),
        });
        this.widget?.display();
    }

    async buttonClick(login: string, data: any) {
        await tmc.chatCmd.execute(login, "/list");
    }
}