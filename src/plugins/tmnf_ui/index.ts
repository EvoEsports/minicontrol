
const environments = ['Stadium', 'Speed', 'Alpine', 'Bay', 'Coast', 'Island', 'Rally'];

export class TmnfUiPlugin {
    constructor() {
        tmc.server.on("TMC.Init", this.onInit.bind(this));
    }

    async onInit() {
        if (tmc.game.Name == "TmForever") {
            tmc.server.on("Trackmania.BeginMap", this.onBeginMap.bind(this));
            this.sendMod();
        }
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

tmc.addPlugin("tmnf_ui", new TmnfUiPlugin());
