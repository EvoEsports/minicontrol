import Plugin from "@core/plugins";
import Widget from "@core/ui/widget";

export default class ToggleChat extends Plugin {
    enabled: { [key: string]: boolean } = {};
    widget: Widget | null = null;

    async onLoad() {
        this.widget = new Widget("widget.xml.twig", import.meta.dir);
        this.widget.pos = { x: -160, y: -40, z: 5 };
        this.widget.size = { width: 15, height: 3 };
        this.widget.setOpenAction(this.manialinkToggle.bind(this));
        await this.widget.display();
        this.addCommand("/togglechat", this.cmdChat.bind(this), "Toggle chat visibility");
    }

    async onUnload() {

    }

    async cmdChat(login: string, params: string[]) {
        let visible = false;
        if (params.length > 1) {
            visible = params[1] === "on";
        }
        await this.setChat(login, visible);
    }

    async setChat(login: string, visible: boolean) {
        this.enabled[login] = visible;
        const status = visible ? "on" : "off";
        tmc.chat(`¤info¤Chat visibility: ¤white¤${status}`, login);
        const manialink = this.getTmnfManialink(visible);
        await tmc.server.call("SendDisplayManialinkPageToLogin", login, manialink, 0, false);
    }

    async manialinkToggle(login: string, _params: string[]) {
        if (this.enabled[login] === undefined) this.enabled[login] = true;
        const visible = !this.enabled[login];
        await this.setChat(login, visible);
    }

    getTmnfManialink(chatStatus: boolean): string {
        const chatStatusString = chatStatus ? "true" : "false";
        let xml = `<?xml version="1.0" encoding="UTF-8"?><manialinks><custom_ui>`;
        for (const key in tmc.ui.tmnfCustomUi) {
            if (key === "chat") {
                xml += `<chat visible="${chatStatusString}" />`;
            } else {
                xml += `<${key} visible="${tmc.ui.tmnfCustomUi[key] ? "true" : "false"}" />`;
            }
        }
        xml += "</custom_ui></manialinks>";
        return xml;
    }
}
