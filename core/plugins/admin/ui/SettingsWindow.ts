import ListWindow from "@core/ui/listwindow";
import { castType, clone } from "@core/utils";
import { timeStamp } from "node:console";

export default class SettingsWindow extends ListWindow {
    title = "Settings";
    size = { width: 160, height: 120 };
    settingsByIndex: Map<number, string> = new Map();
    tempSettings: Map<string, any> = new Map();

    constructor(login: string) {
        super(login);
        this.setItemsPerPage(10);
        if (tmc.game.Name == "TmForever") {
            this.setColumns({
                type: { title: "Type", width: 20 },
                value: { title: "Value", width: 80, actionKey: "set" },
                default: { title: "Default", width: 20 },
            });
            this.setAction("set", "Set", async (login: string, item) => {
                if (item.type === "boolean") {
                    const value = !tmc.settings.get(item.key);
                    await tmc.settings.set(item.key, value);
                    this.display();
                    return;
                }
                tmc.getPlugin("admin").currentSetting[login] = clone(item);
                tmc.chat(`¤info¤type ¤cmd¤//set <value> ¤info¤to change $fff${item.key}`, login);
                this.destroy();
            });
        } else {
            this.setColumns({
                type: { title: "Type", width: 20 },
                rawValue: { title: "Value", width: 80, type: "entry" },
                default: { title: "Default", width: 20 },
            });
            this.setApplyButtons(true);

        }

        this.setAction("reset", "Reset", async (login: string, item) => {
            tmc.settings.reset(item.key);
            this.tempSettings.set(item.key, tmc.settings.getDefault(item.key));
            this.display();
        });
    }

    private processEntries(entries: any) {
        if (!entries) return;
        for (const key in entries) {
            const match = key.match(/^item_(\d+)$/);
            if (!match) continue;
            const settingKey = this.settingsByIndex.get(Number.parseInt(match[1]));
            if (typeof settingKey === "string") this.tempSettings.set(settingKey, entries[key]);
        }
    }

    async uiPaginate(login: string, action: string, entries: any) {
        this.processEntries(entries);
        await super.uiPaginate(login, action, entries);
    }

    async onApply(login: string, data: any, entries: any) {
        this.processEntries(entries);
        for (const key of this.tempSettings.keys()) {
            const value = this.tempSettings.get(key);
            const oldValue = clone(tmc.settings.settings[key]);
            const newValue = clone(value);
            if (oldValue !== newValue) {
                tmc.settings.settings[key] = value;
                if (tmc.settings.callbacks[key]) {
                    await tmc.settings.callbacks[key](newValue, oldValue, key);
                }
            }
        }
        tmc.settings.save();
        tmc.server.emit("TMC.SettingsChanged", {});
        tmc.chat("Settings Saved", tmc.admins);
        this.destroy();
    }

    refreshItems() {
        const settings = tmc.settings.getSettings();
        const out: any = [];
        this.settingsByIndex.clear();

        for (const key in settings.defaults) {
            let value = this.tempSettings.get(key);
            if (value === undefined) {
                value = clone(tmc.settings.settings[key]);
                this.tempSettings.set(key, value);
            }
            const rawValue = value;
            let defaultValue = settings.defaults[key];
            const description = settings.descriptions[key];

            if (typeof settings.defaults[key] === "boolean") {
                value = value ? "$090true" : "$900false";
                defaultValue = defaultValue ? "$090true" : "$900false";
            }
            if (typeof settings.defaults[key] === "number") {
                value = `$990${value}`;
                defaultValue = `$990${defaultValue}`;
            }
            if (typeof settings.defaults[key] === "string") {
                value = `${value}`;
                defaultValue = `${defaultValue}`;
            }

            const changed = value !== defaultValue;
            let prefix = "";
            let postfix = "";
            if (changed) {
                prefix = "$o";
                postfix = " $z(changed)";
            }
            out.push({
                key: key,
                default: defaultValue,
                rawValue: rawValue,
                value: prefix + value,
                type: typeof settings.defaults[key],
                title: description,
            });
        }
        const items = out.sort((a: any, b: any) => a.key.localeCompare(b.key));
        let i = 0;
        for (const item of items) {
            this.settingsByIndex.set(i, item.key);
            i += 1;
        }
        this.setItems(items);
    }

    async display() {
        this.refreshItems();
        await super.display();
    }




}