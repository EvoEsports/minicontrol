import Plugin from '@core/plugins';
import Widget from '@core/ui/widget';

export default class ToggleChat extends Plugin {
    static depends: string[] = ["game:TmForever"];
    enabled: { [key: string]: boolean } = {};
    widget: Widget | null = null;

    async onLoad() {
        this.widget = new Widget("core/plugins/tmnf/togglechat/widget.twig");
        this.widget.pos = { x: -154, y: -40 };
        this.widget.size = { width: 12, height: 5 };
        this.widget.setOpenAction(this.manialinkToggle.bind(this));
        await this.widget.display();
        tmc.addCommand("/togglechat", this.cmdChat.bind(this), "Toggle chat visibility");
    }

    async onUnload() {
        this.widget?.destroy();
        this.widget = null;
        tmc.removeCommand("/togglechat");
    }

    async cmdChat(login: string, params: string[]) {
        let visible = false;
        if (params.length > 1) {
            visible = params[1] == "on";
        }
        await this.setChat(login, visible);
    }

    async setChat(login: string, visible: boolean) {
        this.enabled[login] = visible;
        let status = visible ? "on" : "off";
        tmc.chat(`¤info¤Chat visibility: ¤white¤${status}`, login);
        const manialink = this.getTmnfManialink(visible);
        await tmc.server.call("SendDisplayManialinkPageToLogin", login, manialink, 0, false);
    }

    async manialinkToggle(login: string, params: string[]) {
        if (this.enabled[login] === undefined) this.enabled[login] = true;
        const visible = !this.enabled[login];
        await this.setChat(login, visible);
    }

    getTmnfManialink(chatStatus: boolean): string {
        const chatStatusString = chatStatus ? "true" : "false";
        return `<manialinks><custom_ui><chat visible="${chatStatusString}"/><notice visible="false"/>
        <challenge_info visible="false"/></custom_ui></manialinks>`;
    }

}