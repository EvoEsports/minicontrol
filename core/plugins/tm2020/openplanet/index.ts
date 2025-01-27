import type { Player } from '@core/playermanager';
import Plugin from '@core/plugins';
import Manialink from '@core/ui/manialink';
import { parseEntries } from '@core/utils';


export default class OpenPlanet extends Plugin {
    static depends:string[] = ["game:Trackmania"];
    action: string = "";

    async onLoad() {
        if (process.env['FORCE_OP_MODE']) {
            tmc.server.addListener("TMC.PlayerConnect", this.onPlayerConnect, this);
        }
    }

    async onStart() {
        if (process.env['FORCE_OP_MODE']) {
            let widgets: Manialink[] = [];
            for (let player of tmc.players.getAll()) {
                widgets.push(this.getManialink(player.login));
            }
            await tmc.ui.displayManialinks(widgets);
        }
    }

    async onUnload() {
        tmc.server.removeListener("TMC.PlayerConnect", this.onPlayerConnect);
    }

    async onPlayerConnect(player: Player) {
        let widget = this.getManialink(player.login);
        await widget.display();
    }

    getManialink(login: string) {
        let widget = new Manialink();
        widget.recipient = login;
        // widget.data['replyAction'] = this.action;
        widget.data['signature'] = process.env['FORCE_OP_MODE'];
        widget.template = "core/plugins/tm2020/openplanet/opdetect.xml.twig";
        return widget;
    }

}
