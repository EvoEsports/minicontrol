import { htmlEntities, formatTime } from '@core/utils';
import Plugin from '@core/plugins';
import Widget from '@core/ui/widget';

export default class MapWidget extends Plugin {
    static depends: string[] = ["maps"];
    widget: Widget | null = null;

    async onLoad() {
        this.widget = new Widget("core/plugins/widgets/map/widget.xml.twig");
        this.widget.pos = { x: 121, y: 89, z: 1 };
        this.widget.size = { width: 38, height: 10 };
        this.widget.setOpenAction(this.buttonClick.bind(this));
        tmc.server.addListener("Trackmania.BeginMap", this.beginMap, this);
        const info = tmc.maps.currentMap;
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
            author: htmlEntities(data.AuthorNickname ? data.AuthorNickname : data.Author),
            mapname: htmlEntities(data.Name),
            authortime: formatTime(data.AuthorTime),
        });
        this.widget?.display();
    }

    async buttonClick(login: string, _data: any) {
        await tmc.chatCmd.execute(login, "/list");
    }
}
