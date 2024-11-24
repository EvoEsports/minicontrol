import Plugin from '@core/plugins';
import Widget from '@core/ui/widget';

export default class Favourite extends Plugin {
    static depends: string[] = [];
    widget?: Widget;

    async onStart() {
        if (tmc.game.Name == 'Trackmania') return;
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
        let link = `tmtp://#addfavourite=${tmc.server.login}`;
        if (tmc.game.Name=="ManiaPlanet") link = `maniaplanet://#addfavourite=${tmc.server.login}`
        widget.template = 'core/plugins/widgets/favourite/widget.xml.twig';
        widget.setData({
            link: link
        });
        return widget;
    }
}
