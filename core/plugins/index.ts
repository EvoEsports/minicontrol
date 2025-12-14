import Manialink from "@core/ui/manialink";
import type { ComponentFunction } from "@core/uimanager";

export default abstract class Plugin {
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

    // internal registries so plugins can register listeners / commands
    private __registeredServerListeners: Array<{ method: string; callback: any }> = [];
    private __registeredCommands: string[] = [];
    private __registeredSettings: string[] = [];
    private __registeredColors: string[] = [];

    /**
     * Helper for adding a server listener and automatically tracking it for cleanup.
     * Use this instead of calling tmc.server.addListener directly so the base-class
     * cleanup can reliably remove listeners and free references.
     */
    protected addListener(method: string, callback: any, cls: any = this) {
        try {
            // pass plugin instance as obj parameter so server will bind callback and
            // allow removal by matching wrapper.listener
            tmc.server.addListener(method, callback, cls);
            this.__registeredServerListeners.push({ method, callback });
        } catch (e) {
            // best-effort — don't throw in plugin helper
            tmc.cli(`Failed to add server listener ${method}: ${String(e)}`);
        }
    }

    /**
     * Helper for removing a server listener and updating internal registry.
     */
    protected removeListener(method: string, callback: any) {
        try {
            tmc.server.removeListener(method, callback);
            this.__registeredServerListeners = this.__registeredServerListeners.filter((r) => !(r.method === method && r.callback === callback));
        } catch (e) {
            tmc.cli(`Failed to remove server listener ${method}: ${String(e)}`);
        }
    }

    /**
     * Helper to register a chat/command for cleanup
     */
    protected registerCommand(name: string) {
        this.__registeredCommands.push(name);
    }

    /**
     * Convenience wrapper to add a command and track it for cleanup.
     */
    protected addCommand(name: string, callback: any, help = "") {
        try {
            tmc.addCommand(name, callback.bind(this), help);
            this.registerCommand(name);
        } catch (e) {
            tmc.cli(`Failed to add command ${name}: ${String(e)}`);
        }
    }

    /**
     * Convenience wrapper to register a setting and track it for cleanup.
     * callback can be null or a function. If provided it will be bound to the plugin instance.
     */
    protected addSetting(name: string, defaultValue: any, callback: any = null, description = "") {
        try {
            const cb = callback ? callback.bind(this) : null;
            tmc.settings.register(name, defaultValue, cb, description);
            this.__registeredSettings.push(name);
        } catch (e) {
            tmc.cli(`Failed to add setting ${name}: ${String(e)}`);
        }
    }

    /**
     * Explicitly remove a setting and clear it from the internal registry.
     */
    protected removeSetting(name: string) {
        try {
            tmc.settings.unregister(name);
            this.__registeredSettings = this.__registeredSettings.filter((k) => k !== name);
        } catch (e) {
            tmc.cli(`Failed to remove setting ${name}: ${String(e)}`);
        }
    }

    /**
     * Convenience wrapper to register a color setting and track it for cleanup.
     */
    protected addColor(name: string, defaultValue: any, callback: any = null, description = "") {
        try {
            const cb = callback ? callback.bind(this) : null;
            tmc.settings.registerColor(name, defaultValue, cb, description);
            this.__registeredColors.push(name);
        } catch (e) {
            tmc.cli(`Failed to add color ${name}: ${String(e)}`);
        }
    }

    /**
     * Explicitly remove a color setting and clear it from the internal registry.
     */
    protected removeColor(name: string) {
        try {
            tmc.settings.unregisterColor(name);
            this.__registeredColors = this.__registeredColors.filter((k) => k !== name);
        } catch (e) {
            tmc.cli(`Failed to remove color ${name}: ${String(e)}`);
        }
    }

    /**
     * Perform safe cleanup: remove any registered server listeners and commands,
     * then null-out fields so there are no strong references remaining.
     */
    destroy(): void {
        // Remove tracked listeners
        for (const { method, callback } of this.__registeredServerListeners) {
            try { tmc.server.removeListener(method, callback); } catch { /* ignore */ }
        }
        this.__registeredServerListeners.length = 0;

        // Remove tracked commands
        for (const cmd of this.__registeredCommands) {
            try { tmc.removeCommand(cmd); } catch { /* ignore */ }
        }
        this.__registeredCommands.length = 0;

        // Remove tracked settings
        for (const s of this.__registeredSettings) {
            try { tmc.settings.unregister(s); } catch { /* ignore */ }
        }
        this.__registeredSettings.length = 0;

        // Remove tracked colors
        for (const c of this.__registeredColors) {
            try { tmc.settings.unregisterColor(c); } catch { /* ignore */ }
        }
        this.__registeredColors.length = 0;

        // Null-out any remaining own fields so instance can be GC'd by JS engine
        for (const key of Object.keys(this)) {
            try {
                // Clear WeakRef wrapper objects as well (they won't prevent GC if released)
                // If plugin author created FinalizationRegistry or WeakRefs, nulling fields
                // and removing external listeners will allow GC.
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                if (this[key] instanceof Manialink) {
                    this[key].destroy();
                }
                this[key] = null;
            } catch {
                // ignore protection errors
            }
        }
    }

    /**
     * Add component handler to Manialink UI system
     * @param tagName string
     * @param handler ComponsentFunction
     */
    addComponent(tagName: string, handler: ComponentFunction) {
        tmc.ui.registerComponentHandler(tagName, handler);
    }

    /**
     * Remove component handler from Manialink UI system
     * @param tagName string
     */
    removeComponent(tagName: string) {
        tmc.ui.removeComponentHandler(tagName);
    }

}