import type { Player } from "@core/playermanager";
import Plugin from "@core/plugins";
import Manialink from "@core/ui/manialink";

export default class OpenPlanet extends Plugin {
    action = "";
    envForceMode: string | undefined = process.env["FORCE_OP_MODE"];

    async onLoad() {
        if (this.envForceMode) {
            this.addListener("TMC.PlayerConnect", this.onPlayerConnect, this);
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

    }

    async onPlayerConnect(player: Player) {
        const widget = this.getManialink(player.login);
        widget.display();
    }

    getManialink(login: string) {
        const widget = new Manialink();
        widget.recipient = login;
        // widget.data['replyAction'] = this.action;
        widget.data["signature"] = this.envForceMode;
        widget.template = "opdetect.xml.twig";
        return widget;
    }
}
