import type { Player } from '@core/playermanager';
import Plugin from '@core/plugins';
import Manialink from '@core/ui/manialink';
import { parseEntries } from '@core/utils';

export default class OpenPlanet extends Plugin {
    static depends: string[] = ['game:Trackmania', 'tm2020'];
    action = '';
    envForceMode: string | undefined = process.env['FORCE_OP_MODE'];

    async onLoad() {
        if (this.envForceMode) {
            tmc.server.addListener('TMC.PlayerConnect', this.onPlayerConnect, this);
        }
    }

    async onStart() {
        if (this.envForceMode) {
            const widgets: Manialink[] = [];
            for (const player of tmc.players.getAll()) {
                widgets.push(this.getManialink(player.login));
            }
            await tmc.ui.displayManialinks(widgets);
        }
    }

    async onUnload() {
        tmc.server.removeListener('TMC.PlayerConnect', this.onPlayerConnect);
    }

    async onPlayerConnect(player: Player) {
        const widget = this.getManialink(player.login);
        widget.display();
    }

    getManialink(login: string) {
        const widget = new Manialink();
        widget.recipient = login;
        // widget.data['replyAction'] = this.action;
        widget.data['signature'] = this.envForceMode;
        widget.template = 'core/plugins/tm2020/openplanet/opdetect.xml.twig';
        return widget;
    }
}
