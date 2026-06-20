import ListWindow from "@core/ui/listwindow";
import { globSync, readFileSync } from "fs";
import path from "path";
import { cwd } from "process";

const filepath = path.resolve(`${cwd()}/core/ui/themes`);

export default class SettingsWindow extends ListWindow {
    title = "Themes";
    size = { width: 95, height: 120 };

    constructor(login: string) {
        super(login);
        this.setItemsPerPage(20);

        const files = globSync(filepath + "/*.json").map((f) => {
            return {
                file: f,
                theme: f.replace(filepath, "").replace(/[\\/]+/, "").replace(".json", "")
            }
        });

        this.setItems(files);
        this.setColumns({
            theme: { title: "Theme", width: 80, actionKey: "set" },
        });

        this.setAction("set", "Set", async (login: string, item) => {
            const data = JSON.parse(readFileSync(item.file, "utf-8"));
            tmc.settings.colors = {...tmc.settings.colors, ...data};
            tmc.settings.save();
            tmc.server.emit("TMC.ColorsChanged", {});
            tmc.chat(`¤info¤Theme changed: ¤white¤${item.theme}¤info¤!`);
            await this.display();
        });

    }


}