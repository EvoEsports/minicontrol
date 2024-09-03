import Plugin from "@core/plugins";

export interface ModCollection {
  Stadium: string;
  Island: string;
  Speed: string;
  Rally: string;
  Bay: string;
  Coast: string;
  Alpine: string;
  [key:string]:string;
}

export default class ForceMods extends Plugin {
  static depends: string[] = ["game:TmForever"];
  enabled: boolean = false;
  environments: string[] = [
    "Stadium",
    "Island",
    "Speed",
    "Rally",
    "Bay",
    "Coast",
    "Alpine",
  ];
  defaultModUrl = "http://reaby.kapsi.fi/trackmania/tmnf_mod.zip";
  mods: ModCollection = {
    Stadium: process.env.FORCEMODS_URL_STADIUM || this.defaultModUrl,
    Island: process.env.FORCEMODS_URL_ISLAND || this.defaultModUrl,
    Speed: process.env.FORCEMODS_URL_SPEED || this.defaultModUrl,
    Rally: process.env.FORCEMODS_URL_RALLY || this.defaultModUrl,
    Bay: process.env.FORCEMODS_URL_BAY || this.defaultModUrl,
    Coast: process.env.FORCEMODS_URL_COAST || this.defaultModUrl,
    Alpine: process.env.FORCEMODS_URL_ALPINE || this.defaultModUrl,
  };
  overrideMods: boolean =
    process.env.FORCEMODS_OVERRIDE_TRACKMOD?.toLowerCase() == "true";

  async onLoad() {
    this.enabled = true;
    tmc.cli("¤info¤ForceMods: TmForever detected, enabling plugin.");
    tmc.server.addListener("Trackmania.EndMap", this.onEndMap, this);
  }

  async onUnload() {
    this.enabled = false;
    tmc.server.removeListener("Trackmania.EndMap", this.onEndMap.bind(this));
  }

  async onEndMap(data: any) {
    if (!this.enabled) return;
    const nextMap: any = await tmc.server.call("GetNextChallengeInfo");
    let nextModUrl: string = this.defaultModUrl;
    if (!this.environments.includes(nextMap.Environnement)) {
      tmc.cli(
        `$fa0[ForceMods] WARNING:¤white¤ Next environment ${nextMap.Environnement} unknown. Falling back to default mod.`,
      );
    } else {
      nextModUrl = this.mods[nextMap.Environnement];
      tmc.debug(
        `[ForceMods] DEBUG: Setting next mod for environment ${nextMap.Environnement} to ${nextModUrl}.`,
      );
    }
    if (this.overrideMods) {
      tmc.debug(
        "[ForceMods] DEBUG: Forcing mod to be overwritten due to FORCEMODS_OVERRIDE_TRACKMOD",
      );
    }
    await tmc.server.call("SetForcedMods", this.overrideMods, [
      { Env: nextMap.Environnement, Url: nextModUrl },
    ]);
  }
}
