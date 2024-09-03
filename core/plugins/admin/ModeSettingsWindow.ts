import ListWindow from "@core/ui/listwindow";
import {castType} from "@core/utils";

export default class ModeSettingsWindow extends ListWindow {

    parseEntries(entries: any): void {
        for (let entry of entries) {
            let variable_name = entry['Name'].split("_")[0];
            let index = Number.parseInt(entry['Name'].split("_")[1]) - 1;
            this.items[index][variable_name] = castType(entry.Value, this.items[index].type);
        }
    }

    async uiPaginate(login: string, answer: any, entries: any) {
        this.parseEntries(entries);
        await super.uiPaginate(login, answer, entries);
    }


    async onApply(login: string, data: any, entries: any) {
        this.parseEntries(entries);
        let out: { [key: string]: any } = {};
        for (let item of this.items) {
            out[item.setting] = item.value;
        }
        tmc.server.send("SetModeScriptSettings", out);
        tmc.chat("Settings applied", login);
        await this.hide();
    }
}