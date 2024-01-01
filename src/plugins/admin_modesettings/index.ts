import ListWindow from "../../core/ui/listwindow";

export default class Admin_ModeSettings {
    constructor() {
        tmc.server.on("TMC.Init", this.onInit.bind(this));
    }


    async onInit() {
        if (tmc.game.Name == "TmForever") return;
        tmc.addCommand("//modesettings", this.cmdModeSettings.bind(this), "Display mode settings");
        tmc.addCommand("//set", this.cmdSetSetting.bind(this), "Set mode setting");
    }


    async cmdModeSettings(login: any, args: string[]) {
        const window = new ListWindow(login);
        window.size = { width: 135, height: 100 };
        window.title = "Mode Settings";
        const settings = await tmc.server.call("GetModeScriptSettings");
        let out = [];
        for (const data in settings) {
            out.push({
                setting: data,
                value: settings[data],
                type: typeof settings[data]
            });
        }
        window.setItems(out);
        window.setColumns([
            { key: "setting", title: "Setting", width: 50 },
            { key: "value", title: "Value", width: 50 },
            { key: "type", title: "Type", width: 20 }
        ]);
        await window.display();
    }


    async cmdSetSetting(login: any, args: string[]) {
        if (args.length < 2) {
            tmc.chat("Usage: ¤cmd¤//set ¤white¤<setting> <value>", login);
            return;
        }
        const setting = args[0];
        const value: string = args[1];
        let outValue: any = null;
        if (value == "true") outValue = true;
        else if (value == "false") outValue = false;
        else if (value == "null") outValue = null;
        else if (!Number.isNaN(Number(value))) {
            if (value.indexOf(".") !== undefined) outValue = Number.parseFloat(args[1]);
            else outValue = Number.parseInt(value);
        }
        else if (typeof value == "string") outValue = value;
        else {
            tmc.chat("Invalid value", login);
            return;
        }

        try {
            await tmc.server.call("SetModeScriptSettings", { [setting]: outValue });
        } catch (e: any) {
            tmc.chat("Error: " + e.message, login);
            return;
        }
        tmc.chat(`Set ${setting} to ${outValue}`, login);
    }
}

tmc.addPlugin("admin_modesettings", new Admin_ModeSettings);