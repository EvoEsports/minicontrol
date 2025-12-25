import type { CallableCommand } from "@core/commandmanager";
import type { Player } from "@core/playermanager";
import type { CallbackSetting } from "@core/settingsmanager";
import Manialink from "@core/ui/manialink";


export interface PluginRegistry { }

export interface IPlayerInfo {
    Login: string;
    NickName: string;
    PlayerId: number;
    TeamId: number;
    SpectatorStatus: number;
    Flags: number;
    LadderRanking: number;
}

export interface IMap {
    Uid: string;
    Name: string;
    FileName: string;
    Author: string;
    AuthorNickname: string;
    Environnement: string;
    Mood: string;
    BronzeTime: number;
    SilverTime: number;
    GoldTime: number;
    AuthorTime: number;
    CopperPrice: number;
    LapRace: boolean;
    NbLaps: number;
    NbCheckpoints: number;
    MapType: string;
    MapStyle: string;
}

export interface IEntryVal {
    Name: string;
    Value: string;
}
export type StateNames = "NewVote" | "VoteCancelled" | "VotePassed" | "VoteFailed";

export interface EventMap {
    'Trackmania.BeginMap': [map: IMap];
    'Trackmania.BeginMatch': [];
    'Trackmania.BeginRound': [];
    'Trackmania.BillUpdated': [billId: number, state: number, stateName: string, transactionId: number];
    'Trackmania.Echo': [value1: string, value2: string];
    'Trackmania.EndMap': [];
    'Trackmania.EndRound': [];
    'Trackmania.EndMatch': [map: IMap];
    'Trackmania.PlayerAlliesChanged': [playerLogin: string];
    'Trackmania.PlayerConnect': [playerLogin: string, isSpectator: boolean, playerUid: number];
    'Trackmania.PlayerDisconnect': [playerLogin: string, reason: string];
    'Trackmania.PlayerCheckpoint': [playerid: number, playerLogin: string, time: number, curLap: number, checkpointIndex: number];
    'Trackmania.PlayerFinish': [playerid: number, playerLogin: string, finishTime: number];
    'Trackmania.PlayerChat': [playerid: number, playerLogin: string, message: string, isREgisteredCmd: boolean, options: number];
    'Trackmania.PlayerInfoChanged': [playerinfo: IPlayerInfo];
    'Trackmania.PlayerManialinkPageAnswer': [playerid: number, login: string, answer: string, entries: IEntryVal];
    'Trackmania.PlayerIncoherence': [playerid: number, playerLogin: string];
    'Trackmania.ServerStart': [];
    'Trackmania.ServerStop': [];
    'Trackmania.StatusChanged': [statuscode: number, statusName: string];
    'Trackmania.TunnelDataReceived': [playerUid: number, playerLogin: string, data: Buffer];
    'Trackmania.VoteUpdated': [stateName: StateNames, login: string, cmdName: string, cmdParam: string];
    'Trackmania.LoadData': [type: string, id: string];
    'Trackmania.SaveData': [type: string, id: string];
    'Trackmania.MapListModified': [curMapIndex: number, nextMapIndex: number, isListModified: boolean];
    'TMC.MapListModified': [curMapIndex: number, nextMapIndex: number, isListModified: boolean];
    'TMC.SettingsChanged': [];
    'TMC.ColorsChanged': [];
    'TMC.AdminsChanged': [];
    'TMC.PlayerFinish': [login: string, finishTime: number];
    'TMC.PlayerCheckpoint': [login: string, time: number, curLap: number, checkpointIndex: number];
    'TMC.PlayerGiveup': [login: string];
}

export interface EventObjectMap {
    'TMC.PlayerConnect': [player: Player];
    'TMC.PlayerDisconnect': [player: Player, reason?: string];
}

export default abstract class Plugin {
    /**
     * called after plugin is loaded to runtime.
     * you should initialize listeners here.
     * @ignore
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
     * @ignore
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
     * @ignore
     */
    async onStart() {
        return;
    }

    // internal registries so plugins can register listeners / commands
    private __registeredServerListeners: Array<{ method: string; callback: any }> = [];
    private __registeredCommands: string[] = [];
    private __registeredSettings: string[] = [];
    private __registeredColors: string[] = [];

    // Public typed overloads using EventMap and EventObjectMap for IDE autocomplete
    public addListener<T = unknown, K extends keyof EventMap = keyof EventMap>(method: K, callback: (this: T, data: EventMap[K]) => void, thisObj: T): void;
    public addListener<T = unknown, K extends keyof EventObjectMap = keyof EventObjectMap>(method: K, callback: (this: T, ...data: EventObjectMap[K]) => void, thisObj: T): void;
    public addListener<T = unknown>(method: string, callback: (this: T, ...data: any[]) => void, thisObj: T): void;
    public addListener(method: string, callback: any, cls: any = this): void {
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
    protected addCommand(name: string, callback: CallableCommand, help: string = "") {
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
    protected addSetting(name: string, defaultValue: any, callback: null | CallbackSetting = null, description = "") {
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
    protected addColor(name: string, defaultValue: any, callback: null | CallbackSetting, description = "") {
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
}