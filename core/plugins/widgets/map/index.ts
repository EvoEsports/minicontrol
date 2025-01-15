import { htmlEntities, formatTime } from '@core/utils';
import Plugin from '@core/plugins';
import Widget from '@core/ui/widget';
import type Tmx from '@core/plugins/tmx';

export default class MapWidget extends Plugin {
    static depends: string[] = ['maps'];
    widget: Widget | null = null;
    tmxInfo: any;

    async onLoad() {
        tmc.settings.register('widget.maps.fetchTmxInfo', true, null, "Widgets: Fetch TMX info for map widget");

        this.widget = new Widget('core/plugins/widgets/map/widget.xml.twig');
        this.widget.pos = { x: 121, y: 89, z: 1 };
        this.widget.size = { width: 38, height: 9 };
        this.widget.setOpenAction(this.buttonClick.bind(this));
        tmc.server.addListener('Trackmania.BeginMap', this.beginMap, this);
        const info = tmc.maps.currentMap;
        await this.display([info]);
    }

    async onUnload() {
        this.widget?.hide();
        this.widget = null;
        tmc.server.removeListener('Trackmania.BeginMap', this.beginMap);
    }

    async beginMap(data: any) {
        await this.display(data);
    }

    async getTmxData() {
        const uuid = tmc.maps.currentMap?.UId;
        let type: undefined | string = undefined;
        if (uuid) {
            if (tmc.game.Name == 'TmForever' && tmc.maps.currentMap?.Environnement != 'Stadium') {
                type = 'TMUF';
            }
            return await (tmc.plugins['tmx'] as Tmx).getTmxInfo(uuid, type);
        }
        return {};
    }

    getTmxLogo() {
        switch (tmc.game.Name) {
            case 'TmForever':
                return {
                    url: 'http://images.mania.exchange/logos/tm1x/long.png',
                    size: "10 5",
                };
            case 'ManiaPlanet':
                return {
                    url: 'http://images.mania.exchange/logos/mx/long_sm.png',
                    size: "22 4",
                };
            case 'Trackmania':
                return {
                    url: 'http://images.mania.exchange/logos/tmx/long_sm.png',
                    size: "22 4",
                };
        }
        return {
            url: 'http://images.mania.exchange/logos/mx/long_w_sm.png',
            size: "22 4",
        };
    }

    async display(data: any) {
        data = data[0];
        if (Object.keys(tmc.plugins).includes('tmx')) {
            if (tmc.settings.get('widget.maps.fetchTmxInfo')) {
                this.tmxInfo = await this.getTmxData();
                if (this.tmxInfo) {
                    data = { ...data, ...this.tmxInfo };
                }
            }
        }

        let tmxUrl = data.TmxUrl + "mapshow/" + data.TmxId;
        if (tmc.game.Name == 'TmForever') {
            tmxUrl = data.TmxUrl.replace("https://", "http://") + "trackshow/" + data.TmxId;
        }

        this.widget?.setData({
            author: htmlEntities(data.AuthorNickname ? data.AuthorNickname : data.Author),
            mapname: htmlEntities(data.Name),
            authortime: formatTime(data.AuthorTime),
            wrTime: formatTime(data.wrTime),
            wrHolder: htmlEntities(data.wrHolder || 'n/a'),
            tmx: this.getTmxLogo(),
            tmxUrl: tmxUrl,
            info: data.Style ? data.Style + ' $fff/ ' + data.Difficulty : 'No TMX info'
        });

        this.widget?.display();
    }

    async buttonClick(login: string, _data: any) {
        await tmc.chatCmd.execute(login, '/list');
    }
}
