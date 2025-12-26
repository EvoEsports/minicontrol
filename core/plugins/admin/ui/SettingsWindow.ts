import ListWindow from "@core/ui/listwindow";
import { clone } from "@core/utils";


export default class SettingsWindow extends ListWindow {
    title = "Settings";
    size = { width: 160, height: 120 };

    constructor(login: string) {
        super(login);
        this.setItemsPerPage(10);
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
        });

        this.setAction("reset", "Reset", async (login: string, item) => {
            tmc.settings.reset(item.key);
            this.display();
        });
    }

    async display() {
        const settings = tmc.settings.getSettings();
        const out: any = [];
        for (const data in settings.defaults) {
            let value = settings.settings[data];
            let defaultValue = settings.defaults[data];
            const description = settings.descriptions[data];

            if (typeof settings.defaults[data] === "boolean") {
                value = value ? "$0f0true" : "$f00false";
                defaultValue = defaultValue ? "$0f0true" : "$f00false";
            }
            if (typeof settings.defaults[data] === "number") {
                value = `$df0${value}`;
                defaultValue = `$df0${defaultValue}`;
            }
            if (typeof settings.defaults[data] === "string") {
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
                key: data,
                default: defaultValue,
                value: prefix + value,
                type: typeof settings.defaults[data],
                title: description,
            });
        }
        this.setItems(out.sort((a: any, b: any) => a.key.localeCompare(b.key)));
        await super.display();
    }
}