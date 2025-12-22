import ListWindow from "@core/ui2/listwindow";
import { clone } from "@core/utils";

function getPreviewColor(color: string) {
    if (color.startsWith("$")) color.replace("$", "");
    if (color.length === 6) {
        return `${color[0]}${color[2]}${color[4]}`;
    } else if (color.length === 3) {
        return color;
    }
    return "fff";
}

export default class SettingsWindow extends ListWindow {
    title = "Colors";
    size = { width: 160, height: 120 };

    constructor(login: string) {
        super(login);
        this.setItemsPerPage(10);
        this.setColumns({
            key: { title: "Key", width: 50 },
            value: { title: "Value", width: 60, actionKey: "set" },
            default: { title: "Default", width: 20 },
        });

        this.setAction("set", "Set", async (login: string, item) => {
            tmc.getPlugin("admin").currentSetting[login] = item;
            tmc.chat(`¤info¤type ¤cmd¤//set <value> ¤info¤to change $fff${item.key}`, login);
            await this.destroy();
        });

        this.setAction("reset", "Reset", async (login: string, item) => {
            await tmc.settings.resetColor(item.key);
            this.display();
        });
    }

    async display() {
        const settings = tmc.settings.getColors();
        const out: any = [];
        for (const data in settings.defaults) {
            const value = settings.colors[data];
            const defaultValue = settings.defaults[data];
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
                type: "color",
                title: `$<$${getPreviewColor(value)}Color$> for ${data}`,
            });
        }
        this.setItems(out.sort((a: any, b: any) => a.key.localeCompare(b.key)));
        await super.display();
    }

}
