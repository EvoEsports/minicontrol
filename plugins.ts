import PluginLoader from './core/plugins/loader';
import { resolvePluginsWithFallback } from './core/plugins/resolver';

// parse flags from command args for commands that accept roots
const parseCmdArgs = (cmdArgs: string[]) => {
    const roots: string[] = [];
    let format: 'tree' | 'tabs' | 'list' = 'tree'; // default
    for (const a of cmdArgs) {
        if (a === '--tree') format = 'tree';
        else if (a === '--tabs') format = 'tabs';
        else if (a === '--list') format = 'list';
        else if (a.startsWith('--')) {
            // ignore unknown flags for now
        } else roots.push(a);
    }
    return { roots, format } as const;
};

// Command handlers
async function handleList(loader: PluginLoader) {
    const list = await loader.list();
    console.log('Installed plugins:');
    for (const item of list) {
        const id = item.id;
        const name = item.manifest?.name ?? '<no-manifest>';
        const version = item.manifest?.version ?? '?';
        const loaded = item.loaded ? '[loaded]' : '[unloaded]';
        const incompatible = item.compatible === false ? '[incompatible]' : '';
        console.log(` - ${id} ${loaded} ${incompatible} ${name} ${version}`);
    }
}

async function handleInstall(loader: PluginLoader, args: string[]) {
    const from = args[1];
    if (!from) return printHelp('install requires path-to-plugin');
    const dst = await loader.install(from);
    console.log(`Installed plugin to ${dst}`);
}

async function handleRemove(loader: PluginLoader, args: string[]) {
    const id = args[1];
    if (!id) return printHelp('remove requires plugin-id');
    await loader.remove(id);
    console.log(`Removed plugin ${id}`);
}

async function handleDryRun(loader: PluginLoader, cmdArgs: string[]) {
    const parsed = parseCmdArgs(cmdArgs);
    const roots = parsed.roots;
    const format = parsed.format;
    if (roots.length === 0) return printHelp('dry-run requires at least one root plugin id');

    const result = await loader.dryRun(resolvePluginsWithFallback as any, roots);
    const chosen = result.chosen as Map<string, any>;

    // helpers for printing
    const manifestById = new Map<string, any>();
    for (const [k, v] of Array.from(chosen.entries())) manifestById.set(k, v);

    const printList = (order: any[]) => {
        for (const m of order) console.log(` - ${m.id}@${m.version}`);
    };

    const printTabs = (order: any[], rootsForTabs: string[]) => {
        const depth = new Map<string, number>();
        const assignDepth = (node: string, d: number) => {
            const cur = depth.get(node);
            if (cur === undefined || d < cur) depth.set(node, d);
            const m = manifestById.get(node);
            for (const dep of (m?.depends ?? [])) assignDepth(dep.id, d + 1);
        };
        const rs = rootsForTabs.length ? rootsForTabs : Array.from(chosen.keys());
        for (const r of rs) assignDepth(r, 0);
        for (const m of order) console.log('\t'.repeat((depth.get(m.id) ?? 0) + 1) + `${m.id}@${m.version}`);
    };

    const printTree = (order: any[], rootsForTree: string[]) => {
        const printed = new Set<string>();
        const printNode = (node: string, prefix = '', isLast = true, seen = new Set<string>()) => {
            if (printed.has(node)) {
                console.log(prefix + (isLast ? '└─ ' : '├─ ') + `${node}@${manifestById.get(node)?.version ?? '?'} (see above)`);
                return;
            }
            console.log(prefix + (isLast ? '└─ ' : '├─ ') + `${node}@${manifestById.get(node)?.version ?? '?'}${seen.has(node) ? ' (cycle)' : ''}`);
            if (seen.has(node)) return;
            seen.add(node);
            const deps = Array.from(manifestById.get(node)?.depends ?? []).map((d: any) => d.id).filter((id: string) => manifestById.has(id)).sort();
            for (let i = 0; i < deps.length; i++) {
                const child = deps[i];
                printNode(child, prefix + (isLast ? '   ' : '│  '), i === deps.length - 1, seen);
            }
            seen.delete(node);
            printed.add(node);
        };

        for (const r of rootsForTree) {
            if (printed.has(r)) {
                console.log(`${r}@${manifestById.get(r)?.version ?? '?'} (see above)`);
                continue;
            }
            console.log(`${r}@${manifestById.get(r)?.version ?? '?'}`);
            const deps = Array.from(manifestById.get(r)?.depends ?? []).map((d: any) => d.id).filter((id: string) => manifestById.has(id)).sort();
            for (let i = 0; i < deps.length; i++) printNode(deps[i], '', i === deps.length - 1, new Set<string>());
            printed.add(r);
        }
    };

    console.log('Dry run result:');
    console.log('Chosen plugins:');
    for (const [k, v] of Array.from(chosen.entries())) console.log(` - ${k}@${v.version}`);

    const rootsForOutput = roots.length ? roots : Array.from(chosen.keys());
    if (format === 'list') {
        console.log('Install order:');
        printList(result.order);
    } else if (format === 'tabs') {
        console.log('Install order:');
        printTabs(result.order, rootsForOutput);
    } else {
        console.log('Install order (tree):');
        printTree(result.order, rootsForOutput);
    }
}

async function handleListPlugins(loader: PluginLoader, cmdArgs: string[]) {
    // prints only the resolver's chosen plugins map (id@version)
    const discovered = await loader.discover();
    const manifests = discovered.map(d => d.manifest).filter(Boolean) as any[];
    if (manifests.length === 0) {
        console.log('No manifests discovered to run resolver on.');
        return;
    }

    const rootsToUse = cmdArgs.length ? cmdArgs : manifests.map((m) => m.id);
    try {
        const result = resolvePluginsWithFallback(manifests, rootsToUse as string[]);
        console.log('Resolver chosen plugins:');
        for (const [k, v] of Array.from(result.chosen.entries())) {
            console.log(` - ${k}@${v.version}`);
        }
    } catch (e: any) {
        console.error('Resolver error:', e?.message ?? e);
        process.exitCode = 2;
    }
}

async function handleOrder(loader: PluginLoader, cmdArgs: string[]) {
    const parsed = parseCmdArgs(cmdArgs);
    const roots = parsed.roots;
    const format = parsed.format;

    // allow CLI to be aware of a MiniControl version via env var MINICONTROL_VERSION
    const discovered = await loader.discover();
    const cliVersion = process.env.MINICONTROL_VERSION ?? process.env.npm_package_version ?? undefined;
    if (cliVersion) console.log(`Using CLI MiniControl version ${cliVersion} to evaluate compatibility.`);
    const manifests = discovered.map(d => d.manifest).filter(Boolean) as any[];
    if (manifests.length === 0) {
        console.log('No manifests discovered to run resolver on.');
        return;
    }

    try {
        const rootsToUse = roots.length ? roots : manifests.map((m) => m.id);
        const result = resolvePluginsWithFallback(manifests, rootsToUse as string[]);
        // map of id -> manifest for printing
        const manifestById = new Map<string, any>();
        for (const [k, v] of Array.from(result.chosen.entries())) manifestById.set(k, v);
        // NOTE: 'order' command now only prints the topological install order.

        if (format === 'list') {
            // Print only the resolved install order
            console.log('Topological install order:');
            for (const m of result.order) console.log(` - ${m.id}@${m.version}`);
        } else if (format === 'tabs') {
            // compute depth map
            const depth = new Map<string, number>();
            function assignDepth(node: string, d: number) {
                const cur = depth.get(node);
                if (cur === undefined || d < cur) depth.set(node, d);
                const m = manifestById.get(node);
                for (const dep of (m?.depends ?? [])) assignDepth(dep.id, d + 1);
            }
            const rootsToUseTabs = roots.length ? roots : Array.from(result.chosen.keys());
            for (const r of rootsToUseTabs) assignDepth(r, 0);
            console.log('Topological install order:');
            for (const m of result.order) {
                const d = (depth.get(m.id) ?? 0) + 1;
                console.log('\t'.repeat(d) + `${m.id}@${m.version}`);
            }
        } else {
            console.log('Topological install order (tree):');
            // Print as tree (dependencies as children)

            function printTreeNode(node: string, prefix = '', isLast = true, seen = new Set<string>()) {
                const label = `${node}@${manifestById.get(node)?.version ?? '?'}${seen.has(node) ? ' (cycle)' : ''}`;
                console.log(prefix + (isLast ? '└─ ' : '├─ ') + label);
                if (seen.has(node)) return;
                seen.add(node);
                const deps = Array.from(manifestById.get(node)?.depends ?? []).map((d: any) => d.id).filter((id: string) => manifestById.has(id)).sort();
                for (let i = 0; i < deps.length; i++) {
                    const child = deps[i];
                    const last = i === deps.length - 1;
                    const newPrefix = prefix + (isLast ? '   ' : '│  ');
                    printTreeNode(child, newPrefix, last, seen);
                }
                seen.delete(node);
            }

            const rootsForTree = rootsToUse;
            const printedGlobal = new Set<string>();

            for (const r of rootsForTree) {
                if (printedGlobal.has(r)) {
                    console.log(`${r}@${manifestById.get(r)?.version ?? '?'} (see above)`);
                    continue;
                }
                console.log(`${r}@${manifestById.get(r)?.version ?? '?'}`);
                function printChildren2Collapsed(parent: string, prefix = '', seen = new Set<string>()) {
                    const deps = Array.from(manifestById.get(parent)?.depends ?? []).map((d: any) => d.id).filter((id: string) => manifestById.has(id)).sort();
                    for (let i = 0; i < deps.length; i++) {
                        const child = deps[i];
                        const last = i === deps.length - 1;
                        if (printedGlobal.has(child)) {
                            console.log(prefix + (last ? '└─ ' : '├─ ') + `${child}@${manifestById.get(child)?.version ?? '?'} (see above)`);
                            continue;
                        }
                        printTreeNode(child, prefix, last, seen);
                        printedGlobal.add(child);
                    }
                }
                printChildren2Collapsed(r, '', new Set<string>());
                printedGlobal.add(r);
            }
        }
    } catch (e: any) {
        console.error('Resolver error:', e?.message ?? e);

        // Fallback: resolver failed (likely cycle). Produce dependents-first traversal
        // which prints roots first followed by dependants (main plugin first, then dependants)
        try {
            const rootsToUse = roots.length ? roots : manifests.map((m) => m.id);

            // Build dependents map: id -> set of dependants
            const dependents = new Map<string, Set<string>>();
            const manifestByIdFallback = new Map<string, any>();
            for (const m of manifests) manifestByIdFallback.set(m.id, m);
            for (const m of manifests) {
                for (const dep of (m.depends ?? [])) {
                    if (!dependents.has(dep.id)) dependents.set(dep.id, new Set());
                    dependents.get(dep.id)!.add(m.id);
                }
            }

            const visited = new Set<string>();
            const order: string[] = [];

            function dfs(node: string) {
                if (visited.has(node)) return;
                visited.add(node);
                order.push(node);
                const deps = Array.from(dependents.get(node) ?? []);
                deps.sort(); // deterministic
                for (const child of deps) dfs(child);
            }

            for (const r of rootsToUse) dfs(r);

            // finally append any remaining manifests not reachable from roots
            const allIds = manifests.map((m) => m.id).sort();
            for (const id of allIds) if (!visited.has(id)) order.push(id);

            if (format === 'list') {
                console.log('Fallback dependents-order:');
                for (const id of order) console.log(` - ${id}@${manifestByIdFallback.get(id)?.version ?? '?'}`);
            } else if (format === 'tabs') {
                console.log('Fallback dependents-order (tabs):');
                // print with tab indentation based on position in traversal (we can compute depth while DFS)
                const depths = new Map<string, number>();
                function dfsDepth(node: string, level = 0) {
                    if (depths.has(node)) return;
                    depths.set(node, level);
                    const deps = Array.from(dependents.get(node) ?? []).sort();
                    for (const child of deps) dfsDepth(child, level + 1);
                }
                for (const r of rootsToUse) dfsDepth(r, 0);
                for (const id of order) console.log('\t'.repeat((depths.get(id) ?? 0) + 1) + `${id}@${manifestByIdFallback.get(id)?.version ?? '?'}${visited.has(id) ? '' : ' (unreachable)'}`);
            } else {
                // tree format
                console.log('Fallback dependents-order (tree):');
                const printedGlobal2 = new Set<string>();
                function printDependentNode(node: string, prefix = '', isLast = true, seen = new Set<string>()) {
                    const label = `${node}@${manifestByIdFallback.get(node)?.version ?? '?'}${seen.has(node) ? ' (cycle)' : ''}`;
                    console.log(prefix + (isLast ? '└─ ' : '├─ ') + label);
                    if (seen.has(node)) return;
                    seen.add(node);
                    const deps = Array.from(dependents.get(node) ?? []).sort();
                    for (let i = 0; i < deps.length; i++) {
                        const child = deps[i];
                        const last = i === deps.length - 1;
                        if (printedGlobal2.has(child)) {
                            console.log(prefix + (isLast ? '   ' : '│  ') + (last ? '└─ ' : '├─ ') + `${child}@${manifestByIdFallback.get(child)?.version ?? '?'} (see above)`);
                            continue;
                        }
                        printDependentNode(child, prefix + (isLast ? '   ' : '│  '), last, seen);
                        printedGlobal2.add(child);
                    }
                    seen.delete(node);
                }

                for (const r of rootsToUse) {
                    if (printedGlobal2.has(r)) {
                        console.log(`${r}@${manifestByIdFallback.get(r)?.version ?? '?'} (see above)`);
                        continue;
                    }
                    console.log(`${r}@${manifestByIdFallback.get(r)?.version ?? '?'}`);
                    printDependentNode(r, '', true, new Set<string>());
                    printedGlobal2.add(r);
                }
            }
        } catch (err: any) {
            console.error('Fallback ordering failed:', err?.message ?? err);
            process.exitCode = 3;
        }
    }
}

/**
 * Simple CLI for plugin management.
 * Supports: list, install <path>, remove <id>, dry-run <root...>
 */
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) return printHelp();

    const command = args[0];
    const loader = new PluginLoader();

    try {
        switch (command) {
            case 'list': {
                await handleList(loader);
                break;
            }

            case 'install': {
                await handleInstall(loader, args);
                break;
            }

            case 'remove': {
                await handleRemove(loader, args);
                break;
            }

            case 'listplugins': {
                await handleListPlugins(loader, args.slice(1));
                break;
            }

            case 'dry-run': {
                await handleDryRun(loader, args.slice(1));
                break;
            }

            case 'order': {
                await handleOrder(loader, args.slice(1));
                break;
            }

            case 'help':
            default:
                printHelp();
        }
    } catch (e: any) {
        console.error('Error:', e?.message ?? e);
        process.exitCode = 2;
    }
}

function printHelp(extra?: string) {
    if (extra) console.log('Error:', extra);
    console.log('Usage: plugins.ts <command> [args]');
    console.log('Commands:');
    console.log('  list                      List installed plugins');
    console.log('  install <path>            Install plugin from local folder');
    console.log('  remove <plugin-id>        Remove an installed plugin');
    console.log('  dry-run <root...>         Show resolved graph for given root plugin(s)');
    console.log('    --tree   (default)       Show hierarchical tree view (collapses duplicate subtrees)');
    console.log('    --tabs                  Show dependencies with tab indentation depth');
    console.log('    --list                  Show simple flat list (one entry per line)');
    console.log('  listplugins [roots...]    Show resolver chosen plugin set (id@version)');
    console.log('  order [roots...]          Show resolver order for discovered manifests (same format flags)');
}

main();

