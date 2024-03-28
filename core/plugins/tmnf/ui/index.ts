import Plugin from "core/plugins";

const environments = ['Stadium', 'Speed', 'Alpine', 'Bay', 'Coast', 'Island', 'Rally'];

export default class TmnfUiPlugin extends Plugin {
    depends: string[] = ["game:TmForever"];

    async onLoad() {
        tmc.server.addListener("Trackmania.BeginMap", this.onBeginMap, this);
        this.sendMod();
    }

    async onUnload() {
        tmc.server.removeListener("Trackmania.BeginMap", this.onBeginMap.bind(this));
    }

    async onBeginMap() {
        this.sendMod();
    }

    async sendMod() {
        let mods = [];
        for (const env of environments) {
            mods.push({
                Env: env,
                Url: "http://download.dashmap.live/11d6f37c-b5cc-4bf6-88fc-f8d90956b281/tmnf_mod.zip"
            });
        }
        tmc.server.send("SetForcedMods", true, mods);
    }
}
