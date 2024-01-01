import { castType } from "../../core/utils";
import ModeSettingsWindow from "./ModeSettingsWindow";

export default class Admin_ModeSettings {
    constructor() {
        tmc.server.on("TMC.Init", this.onInit.bind(this));
    }


    async onInit() {
        if (tmc.game.Name == "TmForever") return;
        tmc.addCommand("//modesettings", this.cmdModeSettings.bind(this), "Display mode settings");
        tmc.addCommand("//set", this.cmdSetSetting.bind(this), "Set mode setting");
        
        this.cmdModeSettings("EdbzfLXMS_aI_PjZCVaygQ", []);
    }


    async cmdModeSettings(login: any, args: string[]) {
        const window = new ModeSettingsWindow(login);
        window.size = { width: 160, height: 100 };
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
            { key: "setting", title: "Setting", width: 75 },
            { key: "value", title: "Value", width: 50, type: "entry" },
            { key: "type", title: "Type", width: 25 }
        ]);
        window.addApplyButtons();
        await window.display();
    }


    async cmdSetSetting(login: any, args: string[]) {
        if (args.length < 2) {
            tmc.chat("Usage: ¤cmd¤//set ¤white¤<setting> <value>", login);
            return;
        }
        const setting = args[0];
        const value: string = args[1];       

        try {
            await tmc.server.call("SetModeScriptSettings", { [setting]: castType(value) });
        } catch (e: any) {
            tmc.chat("Error: " + e.message, login);
            return;
        }
        tmc.chat(`Set ${setting} to ${value}`, login);
    }
}

tmc.addPlugin("admin_modesettings", new Admin_ModeSettings);