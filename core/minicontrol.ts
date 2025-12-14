/*
    MINIcontrol - server controller for Trackmania games
    Copyright (C) 2024 Evo eSports e.V.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import { require } from "tsx/cjs/api";
import type * as SentryType from "@sentry/node";

const Sentry = require("./sentry", import.meta.url);
declare global {
    const tmc: MiniControl;
    const sentry: typeof SentryType;
}

import PlayerManager, { type Player } from "./playermanager";
import BillManager from "./billmanager";
import Server, { type VersionStruct } from "./server";
import UiManager from "./uimanager";
import MapManager from "./mapmanager";
import CommandManager, { type CallableCommand } from "./commandmanager";
import SettingsManager from "./settingsmanager";
import { clone, getCallerName, processColorString, setMemStart } from "./utils";
import log from "./log";
import fs from "node:fs";
import fsp from "node:fs/promises";
import type Plugin from "./plugins/index";
import PluginLoader from './plugins/loader';
import Database from './database';
import path from "node:path";
import semver from "semver";
import version from "../version.json";
import { pathToFileURL } from "node:url";
import { resolvePluginsWithFallback } from './plugins/resolver';
import { validateManifest, type PluginManifest } from "./plugins/schema";

/**
 * MiniControl class
 */
class MiniControl {
    /**
     * The version of MiniControl.
     */
    readonly brand: string = "$eeeΜΙΝΙ$abccontrol$z$s¤white¤";
    readonly version: string = process.env.npm_package_version || version.version || "unknown";
    /**
     * The start time of MiniControl.
     */
    readonly startTime: number = Date.now();
    /**
     * The admins of MiniControl.
     */
    admins: string[] = [];
    /**
     * The server object.
     */
    server: Server;
    /**
     * The command manager.
     */
    chatCmd: CommandManager;
    /**
     * The map manager.
     */
    maps: MapManager;
    /**
     * The player manager.
     */
    players: PlayerManager;
    /**
     * The UI manager.
     */
    ui: UiManager;
    /**
     * The database manager.
     */
    database: Database;
    /**
     * The settings manager.
     */
    settings: SettingsManager;
    /**
     * The plugins.
     */
    plugins: { [key: string]: Plugin } = {};
    discoveredPlugins: { id: string; path: string; manifest?: PluginManifest; compatible?: boolean; loaded?: boolean }[] = [];
    billMgr: BillManager;
    /**
     * The game object.
     */
    game: VersionStruct = {} as VersionStruct;
    mapsPath = "";
    storage: { [key: string]: any } = {};
    startComplete = false;

    constructor() {
        console.time("Startup");
        this.server = new Server();
        this.maps = new MapManager();
        this.players = new PlayerManager();
        this.ui = new UiManager();
        this.chatCmd = new CommandManager();
        this.billMgr = new BillManager();
        this.settings = new SettingsManager();
        this.database = new Database();
        this.admins = this.settings.admins;
    }

    /**
     * Gets a player object from the player manager.
     * @param login The login of the player.
     * @returns A promise that resolves to the player object.
     */
    async getPlayer(login: string): Promise<Player> {
        return this.players.getPlayer(login);
    }

    /**
     * Adds chat command
     * @param command The command name, should start with / for public or // for admin only
     * @param callback The callback function to execute when the command is triggered.
     * @param help The help text for the command.
     */
    addCommand(command: string, callback: CallableCommand, help = "") {
        this.chatCmd.addCommand(command, callback, help);
    }

    /**
     *  Removes chat command
     * @param command The command name to remove.
     */
    removeCommand(command: string) {
        this.chatCmd.removeCommand(command);
    }

    /**
     * @param name name of the plugin folder in ./plugins
     * @returns
     */
    findPlugin(name: string): string | null {
        const entry = this.discoveredPlugins.find((p) => p.id === name);
        if (entry) return entry.path;
        return null;
    }

    /**
     * Discover plugins present on disk in known plugin directories
     */
    async discoverPlugins(): Promise<{ id: string; path: string; manifest?: PluginManifest; compatible?: boolean; loaded?: boolean }[]> {
        // Use the shared PluginLoader discovery so we don't maintain two discovery implementations.
        const loader = new PluginLoader();
        const discovered = await loader.discover();
        const out: { id: string; path: string; manifest?: PluginManifest; compatible?: boolean; loaded?: boolean }[] = [];

        // Compute nested id relative to known plugin dirs (preserves nested ids like tm2020/nadeoapi)
        const baseDirs = (loader.opts.pluginsDirs ?? ['./core/plugins', './userdata/plugins']).map((d) => path.resolve(process.cwd(), d));

        for (const entry of discovered) {
            const folder = entry.path;
            // require manifest + an index file (same behaviour as the old implementation)
            const hasIndex = fs.existsSync(path.join(folder, 'index.ts')) || fs.existsSync(path.join(folder, 'index.js'));
            if (!hasIndex || !entry.manifest) continue;

            let id = path.basename(folder).replaceAll('\\', '/');
            for (const base of baseDirs) {
                if (folder.startsWith(base)) {
                    id = path.relative(base, folder).replaceAll('\\', '/');
                    if (id.startsWith(path.sep)) id = id.substring(1);
                    break;
                }
            }

            // determine compatibility: respect loader's compatible (requiresGame) and also
            // verify requiresMinicontrolVersion against this.version when present
            let comp = entry.compatible;
            try {
                if (entry.manifest?.requiresMinicontrolVersion != null) {
                    // if runtime version can't be parsed or doesn't satisfy, mark incompatible
                    if (!semver.satisfies(String(this.version), String(entry.manifest.requiresMinicontrolVersion))) comp = false;
                }
            } catch {
                comp = false;
            }
            out.push({ id, path: folder, manifest: entry.manifest, compatible: comp, loaded: Boolean(this.plugins[id]) });
        }

        return out;
    }

    /**
     * Install a plugin folder into userdata/plugins (copy)
     * @param fromPath path to a folder containing manifest.json
     */
    async installPlugin(fromPath: string): Promise<string> {
        const resolvedFrom = path.resolve(process.cwd(), fromPath);
        if (!fs.existsSync(resolvedFrom)) throw new Error(`Source path not found: ${resolvedFrom}`);

        const manifestPath = path.join(resolvedFrom, 'manifest.json');
        if (!fs.existsSync(manifestPath)) throw new Error('manifest.json not found in source');
        const raw = await fsp.readFile(manifestPath, 'utf8');
        const obj = JSON.parse(raw);
        if (!validateManifest(obj)) throw new Error('Invalid manifest.json');

        const id = obj.id;
        const targetBase = path.resolve(process.cwd(), './userdata/plugins');
        const dst = path.join(targetBase, id);
        if (fs.existsSync(dst)) throw new Error(`Plugin ${id} already installed at ${dst}`);

        const copyDir = async (src: string, dest: string) => {
            await fsp.mkdir(dest, { recursive: true });
            const entries = await fsp.readdir(src, { withFileTypes: true });
            for (const entry of entries) {
                const srcPath = path.join(src, entry.name);
                const dstPath = path.join(dest, entry.name);
                if (entry.isDirectory()) await copyDir(srcPath, dstPath);
                else await fsp.copyFile(srcPath, dstPath);
            }
        };

        await copyDir(resolvedFrom, dst);
        return dst;
    }

    /**
     * Remove an installed plugin (must not be loaded)
     */
    async removePlugin(id: string): Promise<void> {
        if (this.plugins[id]) throw new Error(`Plugin ${id} is loaded; unload before removing`);
        const targetBase = path.resolve(process.cwd(), './userdata/plugins');
        const dst = path.join(targetBase, id);
        if (!fs.existsSync(dst)) throw new Error(`Plugin ${id} not installed`);
        await fsp.rm(dst, { recursive: true, force: true });
    }

    /**
     * List installed plugins
     */
    async listPlugins() {
        return this.discoverPlugins();
    }

    /**
     * Loads a plugin to runtime
     * @param name name of the plugin folder in ./plugins
     * @returns
     */
    async loadPlugin(name: string, visited: Set<string> = new Set()) {
        if (visited.has(name)) return; // already processing, avoid cycles
        visited.add(name);
        if (!this.plugins[name]) {
            const pluginPath = this.findPlugin(name);
            if (!pluginPath) {
                const msg = `¤error¤Plugin ¤cmd¤${name}¤white¤ not found.`;
                this.chat(msg, this.admins);
                this.cli(msg);
                return;
            }
            const pluginUrl = pathToFileURL(path.join(pluginPath, "index.ts")).toString();
            // refresh discovered manifests so we can validate dependency versions
            try {
                if (this.startComplete) this.discoveredPlugins = await this.discoverPlugins();
            } catch {
                // ignore discovery errors; we still try best-effort
            }

            let manifest: PluginManifest = {} as PluginManifest;
            // If a manifest is present for this plugin, validate dependency ranges
            try {
                const mfPath = path.join(pluginPath, 'manifest.json');
                if (fs.existsSync(mfPath)) {
                    const raw = await fsp.readFile(mfPath, 'utf8');
                    const obj = JSON.parse(raw);
                    if (validateManifest(obj)) {
                        manifest = obj;
                        // Check requiresGame against runtime
                        if (obj.requiresGame != null && this.game?.Name && obj.requiresGame !== this.game.Name) {
                            const msg = `¤gray¤Plugin ¤cmd¤${name}¤white¤ not loaded. Manifest requires game ¤cmd¤${obj.requiresGame}¤white¤ but runtime is ¤cmd¤${this.game?.Name}`;
                            this.cli(msg);
                            if (this.startComplete) this.chat(msg);
                            return;
                        }
                        // Check requiresMinicontrolVersion
                        if (obj.requiresMinicontrolVersion != null) {
                            try {
                                if (!semver.satisfies(String(this.version), String(obj.requiresMinicontrolVersion))) {
                                    const msg = `¤gray¤Plugin ¤cmd¤${name}¤white¤ not loaded. Manifest requires MiniControl ${obj.requiresMinicontrolVersion} but runtime is ${this.version}`;
                                    this.cli(msg);
                                    if (this.startComplete) this.chat(msg);
                                    return;
                                }
                            } catch {
                                const msg = `¤gray¤Plugin ¤cmd¤${name}¤white¤ has invalid requiresMinicontrolVersion ${obj.requiresMinicontrolVersion}; skipping.`;
                                this.cli(msg);
                                if (this.startComplete) this.chat(msg);
                                return;
                            }
                        }

                        // Validate dependency version ranges using discovered manifests
                        const byId = new Map<string, PluginManifest[]>();
                        for (const entry of this.discoveredPlugins) {
                            if (!entry.manifest) continue;
                            const list = byId.get(entry.id) ?? [];
                            list.push(entry.manifest);
                            byId.set(entry.id, list);
                        }
                        for (const [id, list] of byId.entries()) list.sort((a, b) => semver.rcompare(a.version, b.version));

                        for (const dep of (obj.depends ?? [])) {
                            // find candidate that satisfies range
                            const candidates = byId.get(dep.id) ?? [];
                            const match = candidates.find((c) => semver.satisfies(c.version, String(dep.range)));
                            if (!match) {
                                if (dep.optional) continue; // optional dependency not present/compatible
                                const msg = `¤gray¤Plugin ¤cmd¤${name}¤white¤ not loaded. No available version for dependency ¤cmd¤${dep.id}¤white¤ matching range ¤cmd¤${dep.range}¤white¤.`;
                                this.cli(msg);
                                if (this.startComplete) this.chat(msg);
                                return;
                            }
                            // ensure dependency is present on disk and loaded
                            if (!this.findPlugin(dep.id)) {
                                const msg = `¤gray¤Plugin ¤cmd¤${name}¤white¤ not loaded. Missing dependency manifest ¤cmd¤${dep.id}¤white¤ on disk.`;
                                this.cli(msg);
                                if (this.startComplete) this.chat(msg);
                                return;
                            }
                            if (!this.plugins[dep.id]) {
                                // Do not auto-load dependencies at runtime — loading dependencies
                                // must be an explicit action (or handled by the resolver at startup).
                                const msg = `¤gray¤Plugin ¤cmd¤${name}¤white¤ not loaded. Dependency ¤cmd¤${dep.id}¤white¤ is present but not loaded.`;
                                this.cli(msg);
                                if (this.startComplete) this.chat(msg, this.admins);
                                return;
                            }
                        }
                    }
                }
            } catch (e: any) {
                this.cli(`¤gray¤Failed to read manifest for ${name}: ${e.message}`);
                manifest = {} as PluginManifest;
            }

            let plugin: any;
            try {
                plugin = await import(pluginUrl);
            } catch (e: any) {
                const msg = `¤error¤Failed to load plugin ¤cmd¤${name}¤white¤: ${e.message}`;
                this.chat(msg, this.admins);
                this.cli(msg);
                return;
            }
            // load and init the plugin
            try {
                tmc.cli(`¤gray¤Loading ¤cmd¤${name}$888@${manifest.version}¤white¤...`);
                const cls = new plugin.default();
                this.plugins[name] = cls;
                await cls.onLoad();
                if (this.startComplete) {
                    await cls.onStart();
                    this.chat(`¤gray¤Plugin ¤cmd¤${name} ¤white¤loaded!`);
                }
                this.cli("¤success¤Success!");
            } catch (e: any) {
                tmc.cli(`¤gray¤Error while starting plugin ¤cmd¤${name}`);
                sentry.captureException(e, {
                    tags: {
                        section: "initPlugin",
                    },
                });
                console.log(e);
            }
        } else {
            const msg = `¤gray¤Plugin ¤cmd¤${name}¤white¤ already loaded.`;
            this.chat(msg);
            this.cli(msg);
        }
    }

    /**
     * Unload a plugin from runtime
     * @param id plugin id
     */
    async unloadPlugin(id: string) {
        if (!this.plugins[id]) {
            const msg = `¤gray¤Plugin ¤cmd¤${id}¤white¤ not loaded.`;
            this.cli(msg);
            return;
        }
        const plugin = this.discoveredPlugins.find((p) => p.id === id);
        // ensure we have a path for later cache cleanup
        const pluginPath = plugin?.path ?? id;

        // refuse to unload if any other loaded plugin depends on this one
        const dependants = new Set<string>();
        for (const otherId of Object.keys(this.plugins)) {
            if (otherId === id) continue;
            const entry = this.discoveredPlugins.find((p) => p.id === otherId);
            const deps = entry?.manifest?.depends ?? [];
            for (const d of deps) {
                if (typeof d === "string") {
                    if (d === id) dependants.add(otherId);
                } else if (d && (d.id === id)) {
                    dependants.add(otherId);
                }
            }
        }

        if (dependants.size > 0) {
            const list = Array.from(dependants).map((s) => `¤cmd¤${s}`).join("$fff, ");
            const msg = `¤gray¤Cannot unload plugin ¤cmd¤${id}¤white¤ — dependant plugin(s) still loaded: ${list}`;
            this.cli(msg);
            if (this.startComplete) this.chat(msg, this.admins);
            return;
        }
        try {
            this.cli(`¤gray¤Unloading ¤cmd¤${id}¤white¤...`);
            if (typeof this.plugins[id].onUnload === 'function') {
                await this.plugins[id].onUnload();
            }
            // remove instance from plugins map
            const file = path.resolve(pluginPath + "/index.ts");
            if (require.cache[file]) {
                Loader.registry.delete(file);
                delete require.cache[file];
                tmc.cli(`¤success¤Require cache for ¤cmd¤${id}¤white¤ cleared.`);
            } else {
                this.cli(`$fffFailed to remove require cache for ¤cmd¤${id}¤white¤, hotreload will not work right.`);
            }
            this.plugins[id].destroy();
            delete this.plugins[id];
            if (global.gc) global.gc();

            this.cli(`¤success¤Plugin ¤cmd¤${id}¤white¤ unloaded.`);
            if (this.startComplete) this.chat(`¤gray¤Plugin ¤cmd¤${id}¤white¤ unloaded.`, this.admins);
        } catch (e: any) {
            this.cli(`¤error¤Error while unloading plugin ¤cmd¤${id}: ${e.message}`);
            try {
                sentry.captureException(e, { tags: { section: 'unloadPlugin' } });
            } catch {
                // ignore sentry failures
            }
        }
    }

    /**
     * send message to console
     * @param object The object to log.
     */
    cli(object: any) {
        const parsed = processColorString(object.toString());
        log.info(parsed);
        if (process.env.DEBUGLEVEL === "3") getCallerName();
    }

    /**
     * log command to console if debug is enabled
     * @param object The object to log.
     */
    debug(object: any) {
        if (process.env.DEBUG === "true") {
            const level = Number.parseInt(process.env.DEBUGLEVEL || "1", 10);
            if (level >= 1) log.debug(processColorString(object.toString()));
            if (level >= 3) getCallerName();
        }
    }

    /**
     * Sends chat message to server
     * @param text string to send to chat
     * @param login {string | string[]} login(s) to send message to, if undefined sends to all players
     */
    chat(text: string, login: undefined | string | string[] = undefined) {
        if (login !== undefined) {
            const msg = `$9ab$n>$z$s ${text.toString()}`;
            this.server.send("ChatSendServerMessageToLogin", processColorString(msg, "$z$s"), typeof login === "string" ? login : login.join(","));
        } else {
            const msg = `$9ab» ¤info¤${text.toString()}`;
            this.server.send("ChatSendServerMessage", processColorString(msg, "$z$s"));
        }
    }

    /**
     * Runs MiniControl.
     * @ignore Should not be called directly
     */
    async run() {
        if (this.startComplete) return;
        const port = Number.parseInt(process.env.XMLRPC_PORT || "5000", 10);
        this.cli(`¤info¤Starting ${this.brand} ¤info¤version: $fff${version.build} (${this.version})`);
        if (typeof Bun !== "undefined") {
            this.cli(`¤info¤Using Bun ¤white¤${Bun.version}`);
        } else {
            this.cli(`¤info¤Using Node ¤white¤${process.version}`);
            if (semver.gt("21.5.0", process.version)) {
                this.cli("¤error¤Your Node version is too old. Must be atleast 21.5.0, please upgrade!");
                process.exit(1);
            }
        }
        this.cli(`¤info¤Connecting to Trackmania Dedicated server at ¤white¤${process.env.XMLRPC_HOST ?? "127.0.0.1"}:${port}`);
        const status = await this.server.connect(process.env.XMLRPC_HOST ?? "127.0.0.1", port);
        if (!status) {
            this.cli("¤error¤Couldn't connect to server.");
            process.exit();
        }
        this.cli("¤info¤Connected to Trackmania Dedicated server.");
        try {
            await this.server.call("Authenticate", process.env.XMLRPC_USER ?? "SuperAdmin", process.env.XMLRPC_PASS ?? "SuperAdmin");
        } catch (e: any) {
            this.cli("¤error¤Authenticate to server failed.");
            this.cli(e.message);
            process.exit();
        }
        await this.server.fetchServerInfo();
        this.game = this.server.version;
        this.server.send("EnableCallbacks", true);
        this.server.send("SendHideManialinkPage");
        if (this.game.Name === "Trackmania") {
            await this.server.call("SetApiVersion", "2023-03-25");
            this.mapsPath = await this.server.call("GetMapsDirectory");
            await this.server.sendScript("XmlRpc.EnableCallbacks", "true");
        } else if (this.game.Name === "TmForever") {
            this.mapsPath = await this.server.call("GetTracksDirectory");
        } else if (this.game.Name === "ManiaPlanet") {
            await this.server.call("SetApiVersion", "2013-04-16");
            this.mapsPath = await this.server.call("GetMapsDirectory");
            await this.server.sendScript("XmlRpc.EnableCallbacks", "true");
            try {
                const settings = { S_UseLegacyXmlRpcCallbacks: false };
                tmc.server.send("SetModeScriptSettings", settings);
            } catch (e: any) {
                tmc.cli(e.message);
            }
        }
        try {
            await this.server.limitScriptCallbacks();
        } catch (e: any) {
            tmc.cli(e.message);
        }
        this.settings.load();
        await this.maps.init();
        await this.players.init();
        await this.ui.init();
        await this.chatCmd.beforeInit();
        await this.database.init();
        this.beforeInit();
    }

    /**
     * Executes tasks before MiniControl initialization.
     * @ignore Shouldn't be called directly
     */
    async beforeInit() {
        this.cli("¤info¤Loading plugins...");
        // discover plugins on disk (recursively) and build load list
        this.discoveredPlugins = await this.discoverPlugins();
        // if PLUGINS env var is provided, it acts as an inclusive whitelist
        const includeEnv = process.env.PLUGINS?.split(",")?.map(s => s.trim()).filter(Boolean) || [];

        // Compile include patterns (supports '*' wildcard, e.g. kacky/*)
        const includePatterns = includeEnv;
        const makeMatcher = (patterns: string[]) => {
            if (!patterns || patterns.length === 0) return (_: string) => true;
            // precompile regex / checks
            const checks: Array<{ type: 'exact' | 'prefix' | 'regex'; value: string | RegExp }> = [];
            for (const p of patterns) {
                if (!p) continue;
                if (p === '*') {
                    // universal match
                    return (_: string) => true;
                }
                if (p.endsWith('/*')) {
                    const prefix = p.slice(0, -2);
                    checks.push({ type: 'prefix', value: prefix });
                    continue;
                }
                if (p.includes('*')) {
                    // convert wildcard to regex
                    const esc = p.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\\\*/g, '.*');
                    checks.push({ type: 'regex', value: new RegExp(`^${esc}$`) });
                    continue;
                }
                checks.push({ type: 'exact', value: p });
            }
            return (id: string) => {
                for (const c of checks) {
                    if (c.type === 'exact' && id === (c.value as string)) return true;
                    if (c.type === 'prefix' && id.startsWith((c.value as string) + '/')) return true;
                    if (c.type === 'regex' && (c.value as RegExp).test(id)) return true;
                }
                return false;
            };
        };

        const matchesInclude = makeMatcher(includePatterns);
        const loadList: string[] = [];
        for (const entry of this.discoveredPlugins) {
            const pluginId = entry.id;
            let include = Boolean(pluginId && typeof pluginId === 'string');
            if (!include) continue;
            if (pluginId.includes('.') || pluginId.includes('node_modules')) include = false;
            // respect explicit requiresGame compatibility (if known) — skip incompatible plugins
            if (entry.compatible === false) include = false;
            // if PLUGINS env var provided, treat it as whitelist for initial load list
            if (includePatterns.length > 0 && !matchesInclude(pluginId)) include = false;
            if (include) loadList.push(pluginId);
        }

        // load metadata from discovered manifests; require manifest.json for strict resolution
        for (const name of loadList) {
            // find discovered entry (discoveredPlugins populated earlier)
            const entry = this.discoveredPlugins.find((p) => p.id === name);
            if (!entry) {
                const msg = `¤error¤Didn't find a plugin entry for ${name} in discovered plugins.`;
                this.cli(msg);
                if (this.startComplete) this.chat(msg, this.admins);
                continue;
            }

            // require a valid manifest; skip otherwise (strict mode)
            if (!entry.manifest) {
                const msg = `¤error¤Plugin ${name} missing manifest.json — skipping (strict manifest mode).`;
                this.cli(msg);
                if (this.startComplete) this.chat(msg, this.admins);
                continue;
            }
        }

        // Use resolver to compute deterministic install order based on manifests + discovered deps.
        try {
            // prepare available manifests
            const available: PluginManifest[] = [];
            // helper to normalize depends to objects
            const toDepEntry = (d: any) => {
                if (!d) return null;
                if (typeof d === 'string') {
                    return { id: d, range: '*' } as any;
                }
                // object with id and range
                if (typeof d === 'object' && d.id) return { id: d.id, range: d.range ?? '*' } as any;
                return null;
            };

            // Prepare available manifests from all discovered plugins (so resolver can see dependencies)
            // If includeEnv is present we treat it as a whitelist: only manifests present in PLUGINS
            // will be available to the resolver (dependencies must be included explicitly).
            const manifestById = new Map<string, PluginManifest>();
            // build a set for quick checks (includeSet already prepared)

            for (const entry of this.discoveredPlugins) {
                if (!entry?.manifest) continue;
                // skip discovered manifests marked incompatible (requiresGame or requiresMinicontrolVersion)
                if (entry.compatible === false) continue;
                // if PLUGINS is present, only include manifests that match it
                if (includePatterns.length > 0 && !matchesInclude(entry.id)) continue;
                // (no explicit excluded list — if includeSet is not present we'll allow discovered manifests)
                const deps = (entry.manifest.depends ?? []).map(toDepEntry).filter(Boolean) as any[];
                manifestById.set(entry.id, { ...entry.manifest, depends: deps });
            }

            // ensure each plugin in loadList has an available manifest entry (strict: no synthetic manifests)
            for (const name of loadList) {
                const entry = manifestById.get(name);
                if (entry) {
                    available.push(entry);
                } else {
                    const msg = `¤error¤Plugin ${name} selected for load but no manifest.json found; skipping.`;
                    this.cli(msg);
                    if (this.startComplete) this.chat(msg, this.admins);
                }
            }

            // Also include any discovered manifests not in loadList so dependencies are visible
            // When PLUGINS is used as a whitelist, we do not include manifests that are not part of the includeSet
            for (const [id, m] of manifestById.entries()) {
                if (includePatterns.length > 0 && !matchesInclude(id)) continue;
                if (!loadList.includes(id)) available.push(m);
            }

            const res = resolvePluginsWithFallback(available, loadList);
            for (const m of res.order) {
                if (loadList.includes(m.id)) await this.loadPlugin(m.id);
            }
        } catch (err: any) {
            // resolver failed — fallback to naive load order
            const msg = `¤gray¤Resolver failed: ${err?.message ?? err}. Falling back to simple load order.`;
            this.cli(msg);
            if (this.startComplete) this.chat(msg, this.admins);
            for (const name of loadList) {
                await this.loadPlugin(name);
            }
        }

        this.server.send("Echo", this.startTime.toString(), "MiniControl");
        this.cli("¤info¤Plugins loaded.");
    }

    /**
     * Executes tasks after MiniControl initialization.
     * @ignore Should not be called directly
     *
     */
    async afterStart() {
        this.billMgr.afterInit();
        this.players.afterInit();
        this.chatCmd.afterInit();
        this.ui.afterInit();
        this.maps.afterInit();
        await this.database.onStart();

        // aggressive GC: prefer option-based GC (Bun / modern runtimes), then fallback to repeated plain calls
        const maybeGc = (globalThis as any).gc ?? (typeof gc !== "undefined" ? gc : undefined);
        if (typeof maybeGc === "function") {
            try {
                // try a major synchronous if runtime supports options
                maybeGc({ type: "major", execution: "sync" });
            } catch { /* ignore */ }

            // run several plain GC passes to aggressively clean up
            for (let i = 0; i < 5; i++) {
                try { maybeGc(); } catch { /* ignore */ }
            }
            // let finalizers / async cleanup run
            await new Promise((r) => setTimeout(r, 50));
        }

        this.startComplete = true;
        setMemStart();
        const msg = `¤info¤Welcome to ${this.brand} ¤info¤version ¤white¤${this.version}¤info¤!`;
        this.chat(msg);
        this.cli(msg);
        for (const plugin of Object.values(this.plugins)) {
            try {
                plugin?.onStart();
            } catch (err: any) {
                this.cli(`¤error¤Error while starting plugin ¤cmd¤${plugin.constructor.name}`);
                /*
                sentry.captureException(err, {
                    tags: {
                        section: 'initPlugin'
                    }
                }); */
                console.log(err);
            }
        }
        console.timeEnd("Startup");
    }
}

(globalThis as any).tmc = new MiniControl();
(globalThis as any).sentry = Sentry;

process.on("SIGINT", () => {
    tmc.server.send("SendHideManialinkPage", 0, false);
    Sentry.close(2000).then(() => {
        console.log("MINIcontrol exits successfully.");
        process.exit(0);
    });
});

process.on("SIGTERM", () => {
    tmc.server.send("SendHideManialinkPage", 0, false);
    Sentry.close(2000).then(() => {
        console.log("MINIcontrol exits succesfully.");
        process.exit(0);
    });
});

process.on("uncaughtException", (err) => {
    tmc.cli(`¤error¤Uncaught error: ${err.message}`);
    if (process.env.DEBUG === "true") {
        console.log(err);
        // process.exit(1);
    }
});

try {
    tmc.run();
} catch (e: any) {
    tmc.cli(`¤error¤${e.message}`);
}

console.log("MINIcontrol is running, add debug point this line to get tmc object to debug console.");
