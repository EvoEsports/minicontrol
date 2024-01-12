import tm from 'tm-essentials';
import { escape } from 'core/utils';
import Plugin from 'core/plugins';
import Widget from 'core/ui/widget';

interface Time {
    login: string;
    time: number;
}

export default class MapWidget extends Plugin {
    id: string = "";
    bestTimes: Time[] = [];
    nbCheckpoints: number = -1;
    widget: Widget | null = null;

    async onLoad() {
        this.id = tmc.ui.uuid();
        this.widget = new Widget("plugins/mapwidget/widget.twig");
        this.widget.title ="Map Info";
        this.widget.pos = { x: 115, y: 90 };
        this.widget.size = { width: 45, height: 14 };
        this.widget.setOpenAction(this.buttonClick.bind(this));
        tmc.server.on("Trackmania.BeginMap", this.beginMap.bind(this));
        const info = tmc.maps.currentMap;
        this.nbCheckpoints = info?.NbCheckpoints || -1;
        await this.display([info]);
    }

    async onUnload() {
        this.widget?.hide();
        this.widget = null;
        tmc.server.removeListener("Trackmania.BeginMap", this.beginMap.bind(this));
    }

    async beginMap(data: any) {
        this.display(data);
    }

    async display(data: any) {
        data = data[0];
        this.widget?.setData({
            author: data.AuthorNickname ? data.AuthorNickname : data.Author,
            mapname: escape(data.Name),
            authortime: tm.Time.fromMilliseconds(data.AuthorTime).toTmString()
        });
        this.widget?.display();
    }

    async buttonClick(login: string, data: any) {
        tmc.chatCmd.execute(login, "/maps");
    }
}