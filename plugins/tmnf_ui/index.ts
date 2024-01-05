import Plugin from "core/plugins";

const environments = ['Stadium', 'Speed', 'Alpine', 'Bay', 'Coast', 'Island', 'Rally'];

export default class TmnfUiPlugin extends Plugin {
    depends: string[] = ["game:TmForever"];

    async onLoad() {
        tmc.server.on("Trackmania.BeginMap", this.onBeginMap.bind(this));
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
        for (let env of environments) {
            mods.push({
                Env: env,
                Url: "http://reaby.kapsi.fi/trackmania/tmnf_mod.zip"
            });
        }
        tmc.server.send("SetForcedMods", true, mods);
    }
}
