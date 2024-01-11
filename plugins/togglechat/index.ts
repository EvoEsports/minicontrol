import Plugin from 'core/plugins';
import fs from 'fs';
import { colors } from 'core/utils';

export default class ToggleChat extends Plugin {
    depends: string[] = ["game:TmForever"];
    enabled: { [key: string]: boolean } = {};
    manialinkId: string = "";
    manialinkAction: string = "";
    template: string = "";

    async onLoad() {
        this.template = fs.readFileSync(import.meta.dir + "/templates/togglechat.twig", "utf8");
        this.manialinkId = tmc.ui.uuid();
        this.manialinkAction = tmc.ui.addAction(this.manialinkToggle.bind(this), "");
        tmc.addCommand("/togglechat", this.cmdChat.bind(this), "Toggle chat visibility");
        const manialink = tmc.ui.render(this.template, { id: this.manialinkId, action: this.manialinkAction, colors: colors });
        tmc.ui.display(manialink);
    }

    async onUnload() {
        tmc.ui.hide(this.manialinkId);
        tmc.ui.removeAction(this.manialinkAction);
        this.manialinkAction = "";
        this.manialinkId = "";
        tmc.removeCommand("/togglechat");
    }

    async cmdChat(login: string, params: string[]) {
        let visible = false;
        if (params.length > 1) {
            visible = params[1] == "on";
        }
        this.setChat(login, visible);
    }

    async setChat(login: string, visible: boolean) {
        this.enabled[login] = visible;
        let status = visible ? "on" : "off";
        tmc.chat(`¤info¤Chat visibility: $fff${status}`, login);
        tmc.ui.display(this.getTmnfManialink(visible), login);
    }

    manialinkToggle(login: string, params: string[]) {
        if (this.enabled[login] === undefined) this.enabled[login] = true;
        const visible = !this.enabled[login];
        this.setChat(login, visible);
    }

    getTmnfManialink(chatStatus: boolean): string {
        const chatStatusString = chatStatus ? "true" : "false";
        return `<custom_ui><chat visible="${chatStatusString}"/></custom_ui>`;
    }

}