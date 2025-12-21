import ListWindow from "@core/ui2/listwindow";

export default class SettingsWindow extends ListWindow {

    constructor(login: string | undefined) {
        super(login);
        this.size = { width: 160, height: 95 };
        this.title = "Settings";

        this.setAction("toggle", "Toggle", this.onToggle.bind(this));
        this.setAction("select", "Select", this.onSelect.bind(this));
        this.setAction("reset", "Reset", this.onReset.bind(this));

    }

    async onToggle(login: string, item: any) {
        if (item.type === "boolean") {
            const value = !tmc.settings.get(item.key);
            await tmc.settings.set(item.key, value);
            await tmc.chatCmd.execute(login, "//settings");
            return;
        }
        tmc.getPlugin("admin").currentSetting[login] = item;
        tmc.chat(`¤info¤type ¤cmd¤//set <value> ¤info¤to change $fff${item.key}`, login);
    }

    async onSelect(login: string, item: any) {
        tmc.getPlugin("admin").currentSetting[login] = item;
        tmc.chat(`¤info¤type ¤cmd¤//set <value> ¤info¤to change $fff${item.key}`, login);
    }

    async onReset(login: string, item: any) {
        await tmc.settings.reset(item.key);
        if (this.recipient) tmc.getPlugin("admin").currentSetting[this.recipient] = undefined;
        tmc.chat(`¤info¤Setting $fff${item.key} ¤info¤reset to default value.`, login);
        await tmc.chatCmd.execute(login, "//settings");
    }

    async hide(): Promise<void> {
        if (this.recipient) tmc.getPlugin("admin").currentSetting[this.recipient] = undefined;
        await super.hide();
    }
}
