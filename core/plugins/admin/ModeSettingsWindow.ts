import ListWindow from "@core/ui/listwindow";

export default class ModeSettingsWindow extends ListWindow {

    async uiPaginate(login: string, answer: any, entries: any) {
        this.parseEntries(entries);
        await super.uiPaginate(login, answer, entries);
    }


    async onApply(login: string, data: any, entries: any) {
        this.parseEntries(entries);
        const out: { [key: string]: any } = {};
        for (const item of this.items) {
            out[item.setting] = item.value;
        }
        tmc.server.send("SetModeScriptSettings", out);
        tmc.chat("Settings applied", login);
        await this.hide();
    }
}
