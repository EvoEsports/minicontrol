/**
 * Plugin loader - provides install/remove/load/unload helpers that operate
 * on plugin folders and call into the running MiniControl instance where
 * available (global `tmc`).
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { validateManifest, type PluginManifest } from './schema';
import semver from 'semver';

export interface LoaderOptions {
    pluginsDirs?: string[]; // directories to search for plugins
    userPluginsDir?: string; // where to install user plugins
}

export default class PluginLoader {
    opts: LoaderOptions;

    constructor(opts?: LoaderOptions) {
        this.opts = opts ?? { pluginsDirs: ['./core/plugins', './userdata/plugins'], userPluginsDir: './userdata/plugins' };
    }

    /**
     * Discover all available plugin manifests under configured plugin directories
     */
    async discover(): Promise<{ path: string; manifest?: PluginManifest; compatible?: boolean }[]> {
        const out: { path: string; manifest?: PluginManifest; compatible?: boolean }[] = [];
        // Traverse plugin directories recursively because plugins can live in nested subfolders (e.g. tm2020/nadeoapi)
        for (const dir of this.opts.pluginsDirs ?? []) {
            const abs = path.resolve(process.cwd(), dir);
            if (!fs.existsSync(abs)) continue;

            const walk = async (current: string, prefix = '') => {
                const children = await fsp.readdir(current, { withFileTypes: true });
                for (const entry of children) {
                    if (!entry.isDirectory()) continue;
                    if (entry.name === 'node_modules') continue;
                    const folder = path.join(current, entry.name);
                    // determine the plugin id relative to the base dir
                    const id = prefix ? `${prefix}/${entry.name}` : entry.name;
                    // treat as plugin if it contains index.ts or index.js or a manifest.json
                    const hasIndex = fs.existsSync(path.join(folder, 'index.ts')) || fs.existsSync(path.join(folder, 'index.js'));
                    const mf = path.join(folder, 'manifest.json');

                    let manifestObj: PluginManifest | undefined = undefined;
                    let compatible: boolean | undefined = undefined;

                    if (fs.existsSync(mf)) {
                        try {
                            const content = await fsp.readFile(mf, 'utf8');
                            const obj = JSON.parse(content);
                            if (validateManifest(obj)) {
                                manifestObj = obj;
                                compatible = true;
                                try {
                                        const runtimeGame = (globalThis as any).tmc?.game?.Name;
                                        if (obj.requiresGame != null && runtimeGame) compatible = obj.requiresGame === runtimeGame;
                                        // also check requiresMinicontrolVersion when runtime provides tmc.version or env var is set
                                        const runtimeVersion = (globalThis as any).tmc?.version ?? process.env.MINICONTROL_VERSION ?? process.env.npm_package_version;
                                    if (obj.requiresMinicontrolVersion != null && runtimeVersion) {
                                        if (!semver.satisfies(String(runtimeVersion), String(obj.requiresMinicontrolVersion))) {
                                            compatible = false;
                                        }
                                    }
                                } catch {
                                    // ignore
                                }
                            }
                        } catch {
                            // ignore parse errors
                        }
                    }

                    if (hasIndex || manifestObj) {
                        out.push({ path: folder, manifest: manifestObj, compatible });
                    }

                    // recurse into subdirectories to find nested plugin folders
                    await walk(folder, id);
                }
            };

            try {
                await walk(abs, '');
            } catch {
                // ignore
            }
        }
        return out;
    }

    /**
     * Install a plugin folder (copy) into the user plugins dir
     * Accepts either a folder path or a zip/tarball - currently only folder copy is supported
     */
    async install(fromPath: string): Promise<string> {
        const resolvedFrom = path.resolve(process.cwd(), fromPath);
        if (!fs.existsSync(resolvedFrom)) throw new Error(`Source path not found: ${resolvedFrom}`);

        // read manifest to determine id
        const manifestPath = path.join(resolvedFrom, 'manifest.json');
        if (!fs.existsSync(manifestPath)) throw new Error('manifest.json not found in source');
        const raw = await fsp.readFile(manifestPath, 'utf8');
        const obj = JSON.parse(raw);
        if (!validateManifest(obj)) throw new Error('Invalid manifest.json');

        const id = obj.id;
        const targetBase = path.resolve(process.cwd(), this.opts.userPluginsDir ?? './userdata/plugins');
        const dst = path.join(targetBase, id);
        if (fs.existsSync(dst)) throw new Error(`Plugin ${id} already installed at ${dst}`);

        // copy folder recursively
        await this.copyFolder(resolvedFrom, dst);
        return dst;
    }

    async copyFolder(src: string, dst: string) {
        await fsp.mkdir(dst, { recursive: true });
        const entries = await fsp.readdir(src, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const dstPath = path.join(dst, entry.name);
            if (entry.isDirectory()) await this.copyFolder(srcPath, dstPath);
            else await fsp.copyFile(srcPath, dstPath);
        }
    }

    /**
     * Remove a plugin from the user plugins dir
     */
    async remove(id: string): Promise<void> {
        const targetBase = path.resolve(process.cwd(), this.opts.userPluginsDir ?? './userdata/plugins');
        const dst = path.join(targetBase, id);
        if (!fs.existsSync(dst)) throw new Error(`Plugin ${id} not installed`);
        await fsp.rm(dst, { recursive: true, force: true });
    }

    /**
     * Load a plugin in-process by calling global tmc.loadPlugin if available
     */
    async load(id: string): Promise<void> {
        // prefer the host API if available
        if (typeof (globalThis as any).tmc?.loadPlugin === 'function') {
            // verify manifest compatibility against runtime when available

            const pluginPath = this.findInstalledPath(id);
            if (pluginPath) {
                const mfPath = path.join(pluginPath, 'manifest.json');
                if (fs.existsSync(mfPath)) {
                    const content = await fsp.readFile(mfPath, 'utf8');
                    const obj = JSON.parse(content);
                        if (validateManifest(obj)) {
                            const runtimeGame = (globalThis as any).tmc?.game?.Name;
                            if (obj.requiresGame != null && runtimeGame && obj.requiresGame !== runtimeGame) {
                                // skip load, incompatible with running game
                                throw new Error(`plugin ${id} requires game ${obj.requiresGame} but runtime is ${runtimeGame}`);
                            }
                            const runtimeVersion = (globalThis as any).tmc?.version ?? process.env.MINICONTROL_VERSION ?? process.env.npm_package_version;
                            if (obj.requiresMinicontrolVersion != null && runtimeVersion) {
                                if (!semver.satisfies(String(runtimeVersion), String(obj.requiresMinicontrolVersion))) {
                                    throw new Error(`plugin ${id} requires minicontrol ${obj.requiresMinicontrolVersion} but runtime is ${runtimeVersion}`);
                                }
                            }
                    }
                }
            }

            // call existing loader
            await (globalThis as any).tmc.loadPlugin(id);
            return;
        }
        // else, no runtime available — try to import dynamically
        const pluginPath = this.findInstalledPath(id);
        if (!pluginPath) throw new Error(`Plugin ${id} not found in any plugin directories`);
        // If we're not running inside MiniControl we still perform manifest checks before importing
        const mfPath = path.join(pluginPath, 'manifest.json');
            if (fs.existsSync(mfPath)) {
                const content = await fsp.readFile(mfPath, 'utf8');
                const obj = JSON.parse(content);
                if (validateManifest(obj)) {
                    const runtimeGame = (globalThis as any).tmc?.game?.Name;
                    if (obj.requiresGame != null && runtimeGame && obj.requiresGame !== runtimeGame) {
                        throw new Error(`plugin ${id} requires game ${obj.requiresGame} but runtime is ${runtimeGame}`);
                    }
                    const runtimeVersion = (globalThis as any).tmc?.version ?? process.env.MINICONTROL_VERSION ?? process.env.npm_package_version;
                    if (obj.requiresMinicontrolVersion != null && runtimeVersion) {
                        if (!semver.satisfies(String(runtimeVersion), String(obj.requiresMinicontrolVersion))) {
                            throw new Error(`plugin ${id} requires minicontrol ${obj.requiresMinicontrolVersion} but runtime is ${runtimeVersion}`);
                        }
                    }
                    // Validate dependency ranges against discovered manifests (best-effort)
                    let discovered;
                    try {
                        discovered = await this.discover();
                    } catch {
                        discovered = null;
                    }
                    if (discovered) {
                        const byId = new Map<string, PluginManifest[]>();
                        for (const entry of discovered) {
                            if (!entry.manifest) continue;
                            const key = path.basename(entry.path);
                            const list = byId.get(key) ?? [];
                            list.push(entry.manifest);
                            byId.set(key, list);
                        }
                        for (const [key, list] of byId.entries()) list.sort((a, b) => semver.rcompare(a.version, b.version));

                        for (const dep of (obj.depends ?? [])) {
                            const candidates = byId.get(dep.id) ?? [];
                            const match = candidates.find((c) => semver.satisfies(c.version, String(dep.range)));
                            if (!match && !dep.optional) {
                                throw new Error(`plugin ${id} requires dependency ${dep.id} matching ${dep.range} but none available`);
                            }
                        }
                    }
                }
        }

        const realPath = fs.realpathSync(pluginPath);
        const url = new URL(`file://${realPath}`);
        const mod = await import(url.href);

        if (!mod.default) throw new Error('Invalid plugin module (no default export)');
        const inst = new mod.default();
        await inst.onLoad();
        await inst.onStart();
    }

    findInstalledPath(id: string): string | null {
        for (const dir of this.opts.pluginsDirs ?? ['./core/plugins', './userdata/plugins']) {
            const p = path.resolve(process.cwd(), dir, id);
            if (fs.existsSync(p)) return p;
        }
        return null;
    }

    /**
     * Unload a plugin in-process by calling global tmc.unloadPlugin if available
     */
    async unload(id: string): Promise<void> {
        if (typeof (globalThis as any).tmc?.unloadPlugin === 'function') {
            await (globalThis as any).tmc.unloadPlugin(id);
            return;
        }

        // Best-effort: attempt to call instance onUnload if loaded by this loader instance.
        // Not implemented: tracking instances outside tmc-backed process.
        throw new Error('unload not available: the loader must be run inside MiniControl process');
    }

    /**
     * List installed plugins with manifest data if available
     */
    async list(): Promise<{ id: string; path: string; manifest?: PluginManifest; loaded?: boolean; compatible?: boolean }[]> {
        const arr = await this.discover();
        return Promise.all(arr.map(async (entry) => ({ id: path.basename(entry.path), path: entry.path, manifest: entry.manifest, loaded: ((globalThis as any).tmc?.plugins?.[path.basename(entry.path)] ? true : false), compatible: entry.compatible })));
    }

    /**
     * Resolve using a provided resolver function (caller supplies available manifests)
     * This method is a small helper; the actual resolver implementation resides elsewhere
     */
    async dryRun(resolver: (available: PluginManifest[], roots: string[]) => any, roots: string[]) {
        const discovered = await this.discover();
        const manifests = discovered.map(d => d.manifest).filter(Boolean) as PluginManifest[];
        return resolver(manifests, roots);
    }
}
