import ListWindow from "@core/ui2/listwindow";
import { castType } from "@core/utils";

interface ModeSetting {
    setting: string;
    value: any;
    type: string;
    description: string;
    default: any;
}

export default class ModeSettingsWindow extends ListWindow {
    size = { width: 180, height: 120 };
    title = "Mode Settings";
    settings: ModeSetting[] = [];

    constructor(login: string) {
        super(login);
        this.setItemsPerPage(20);
        this.setColumns({
            setting: { title: "Setting", width: 45 },
            description: { title: "Description", width: 45 },
            value: { title: "Value", width: 30, type: "entry" },
            type: { title: "Type", width: 10 },
            default: { title: "Default", width: 30 },
        });
        this.setApplyButtons(true);
    }

    async update() {
        const settings = await tmc.server.call("GetModeScriptSettings");
        const info = (await tmc.server.call("GetModeScriptInfo")).ParamDescs || [];

        this.settings = [];
        for (const data in settings) {
            let value = settings[data].toString();
            const type = info.find((i: any) => i.Name === data)?.Type || ""

            if (type === "boolean") {
                value = settings[data] ? "true" : "false";
            }

            this.settings.push({
                setting: data,
                value: value,
                type: type,
                description: info.find((i: any) => i.Name === data)?.Desc || "",
                default: info.find((i: any) => i.Name === data)?.Default || ""
            });
        }
        this.setItems(this.settings);
    }


    async display() {
        this.setItems(this.settings);
        return await super.display();
    }

    private processEntries(entries: any) {
        for (const entry of entries) {
            const index = Number.parseInt(entry.Name.split("_")[1]);
            let out = entry.Value;
            this.settings[index].value = out;
        }
    }
    async uiPaginate(login: string, action: string, entries: any) {
        this.processEntries(entries);
        await super.uiPaginate(login, action, entries);
    }


    async onApply(login: string, data: any, entries: any) {
        this.processEntries(entries);

        const out: { [key: string]: any } = {};
        for (const item of this.settings) {
            if (item.type === "boolean") {
                out[item.setting] = item.value.toLowerCase() === "true" || item.value === true;
            } else {
                out[item.setting] = castType(item.value, item.type);
            }
        }
        try {
            tmc.server.send("SetModeScriptSettings", out);
            tmc.chat("Settings applied", login);
            await this.hide();
        } catch (e) {
            tmc.chat("¤error¤Failed to apply settings", login);
        }
    }
}
