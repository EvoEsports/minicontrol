export default abstract class Plugin {
    /** "game:TmForever | game:ManiaPlanet | game:Trackmania or plugin name to depend" */
    static depends: string[] = [];

    /**
     * called after plugin is loaded to runtime.
     * you should initialize listeners here.
     * @example
     * tmc.server.addListener("Trackmania.PlayerFinish",  this.onPlayerFinish, this);
     * tmc.addCommand("/mycmd", this.onMyCmd.bind(this), "description");
     */
    async onLoad() {
        return;
    }

    /**
     * called when plugin is unloaded from runtime.
     * free resources and remove listeners here.
     * @example
     * tmc.server.removeListener("Trackmania.PlayerFinish", this.onPlayerFinish);
     * tmc.removeCommand("/mycmd");
     */
    async onUnload() {
        return;
    }

    /**
     * called when controller is fully ready
     * or if controller is already ready, called after plugin onLoad
     */
    async onStart() {
        return;
    }

    getDepends(): string[] {
        return Plugin.depends;
    }
}
