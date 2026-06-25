import ListWindow from "@core/ui/listwindow";

interface ModeSetting {
    index: number;
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
    originalSettings: Map<string, any> = new Map();
    settingsByIndex: Map<number, ModeSetting> = new Map();

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
        const infoMap = new Map(info.map((i: any) => [i.Name, i]));

        this.settings = [];
        this.originalSettings.clear();
        this.settingsByIndex.clear();
        
        let index = 0;
        for (const name in settings) {
            const paramInfo = infoMap.get(name) as any;
            const type = paramInfo?.Type || "";
            const value = type === "boolean" ? (settings[name] ? "true" : "false") : (settings[name]?.toString() || "");

            this.originalSettings.set(name, value);
            const setting: ModeSetting = {
                index,
                setting: name,
                value,
                type,
                description: (paramInfo?.Desc === "<hidden>" || !paramInfo?.Desc) ? "" : paramInfo.Desc,
                default: paramInfo?.Default?.toString() || ""
            };
            this.settings.push(setting);
            this.settingsByIndex.set(index, setting);
            index++;
        }
        this.setItems(this.settings);
    }

    async display() {
        this.setItems(this.settings);
        return await super.display();
    }

    private processEntries(entries: any) {
        if (!entries) return;
        for (const key in entries) {
            const match = key.match(/^item_(\d+)$/);
            if (!match) continue;
            const setting = this.settingsByIndex.get(Number.parseInt(match[1]));
            if (setting) setting.value = entries[key].toString();
        }
    }

    async uiPaginate(login: string, action: string, entries: any) {
        this.processEntries(entries);
        await super.uiPaginate(login, action, entries);
    }

    async onApply(login: string, data: any, entries: any) {
        this.processEntries(entries);
        const out: { [key: string]: any } = {};
        let changedCount = 0;

        for (const item of this.settings) {
            const originalValue = this.originalSettings.get(item.setting);
            if (originalValue === item.value) continue;

            changedCount++;
            if (item.type === "boolean") {
                const val = item.value.toString().toLowerCase();
                out[item.setting] = val === "true" || val === "1";
            } else if (item.type === "int") {
                out[item.setting] = Number.parseInt(item.value.toString()) || 0;
            } else {
                out[item.setting] = item.value;
            }
        }

        if (changedCount === 0) {
            tmc.chat("¤info¤No settings were changed", login);
            await this.update();
            return;
        }

        try {
            await tmc.server.call("SetModeScriptSettings", out);
            tmc.chat(`¤success¤Applied ${changedCount} setting${changedCount > 1 ? 's' : ''}: ${Object.keys(out).join(", ")}`, login);
            await this.update();
        } catch (e: any) {
            tmc.chat(`¤error¤Failed to apply: ${e.message || e}`, login);
        }
    }
}
