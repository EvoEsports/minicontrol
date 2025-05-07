import Plugin from '@core/plugins';
import Widget from '@core/ui/widget';

export default class Favourite extends Plugin {
    static depends = ['widgets'];
    widget?: Widget;

    async onStart() {
        if (tmc.game.Name === 'Trackmania') return;
        this.widget = this.createWidget();
        await this.widget.display();
    }

    async onUnload() {
        this.widget?.destroy();
        this.widget = undefined;
    }

    createWidget() {
        const widget = new Widget();
        widget.size = { width: 10, height: 10 };
        widget.pos = { x: -138, y: 72.5, z: 5 };
        const link = `http://reaby.kapsi.fi/trackmania/favourite.php?server=${encodeURIComponent(tmc.server.login)}`;
        widget.template = 'core/plugins/widgets/favourite/widget.xml.twig';
        widget.setData({
            link: link
        });
        return widget;
    }
}
