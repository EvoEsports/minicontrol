import Plugin from "core/plugins";

const environments = ['Stadium', 'Speed', 'Alpine', 'Bay', 'Coast', 'Island', 'Rally'];

export default class TmnfUiPlugin extends Plugin {
    depends: string[] = ["game:TmForever"];

    async onLoad() {
        tmc.server.addListener("Trackmania.BeginMap", this.onBeginMap, this);
        await this.sendMod();
    }

    async onUnload() {
        tmc.server.removeListener("Trackmania.BeginMap", this.onBeginMap.bind(this));
    }

    async onBeginMap() {
        await this.sendMod();
    }

    async sendMod() {
        let mods = [];
        for (const env of environments) {
            mods.push({
                Env: env,
                Url: "http://reaby.kapsi.fi/trackmania/tmnf_mod.zip"
            });
        }
        await tmc.server.call("SetForcedMods", true, mods);
    }
}
