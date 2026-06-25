import semver from 'semver';
import type { PluginManifest, DependencyEntry } from './schema';

/**
 * Result of resolution for a single plugin id
 */
export interface ResolvedPlugin {
    id: string;
    manifest: PluginManifest;
}

export interface ResolveOptions {
    /** Host provided overrides. If present, resolver will prefer these versions (id -> version) */
    hostOverrides?: Record<string, string>;
    /** Optional - if true, choose highest available even when multiple satisfy */
}

export interface ResolveResult {
    /** Map of chosen manifests keyed by plugin id */
    chosen: Map<string, PluginManifest>;
    /** Topologically sorted list with dependencies first */
    order: PluginManifest[];
}

export class ResolveError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ResolveError';
    }
}

/**
 * Deterministic plugin resolver.
 *
 * - Prefers hostOverrides when present
 * - Chooses highest compatible version otherwise
 * - Throws on conflicts when there is no writable solution
 * - Supports optional dependencies by ignoring missing optional entries
 */
export function resolvePlugins(
    available: PluginManifest[],
    roots: string[],
    opts: ResolveOptions = {},
): ResolveResult {
    // Index available manifests by id
    const byId = new Map<string, PluginManifest[]>();
    for (const m of available) {
        const list = byId.get(m.id) ?? [];
        list.push(m);
        byId.set(m.id, list);
    }

    // Sort candidates per id deterministically (highest semver first)
    for (const [id, list] of byId.entries()) {
        list.sort((a, b) => (semver.rcompare(a.version, b.version))); // rcompare gives descending
    }

    const chosen = new Map<string, PluginManifest>();
    const visiting = new Set<string>();

    function pickVersion(id: string, range: string | undefined): PluginManifest | null {
        const candidates = byId.get(id) ?? [];
        // Host override wins if present
        const override = opts.hostOverrides?.[id];
        if (override) {
            const found = candidates.find(c => c.version === override);
            if (!found) throw new ResolveError(`host override ${id}@${override} not available`);
            // If range is specified, ensure compatibility
            if (range && !semver.satisfies(found.version, range)) {
                throw new ResolveError(`host override ${id}@${override} does not satisfy required range ${range}`);
            }
            return found;
        }

        if (!range) {
            // pick highest available
            return candidates[0] ?? null;
        }

        // find highest that satisfies range
        for (const c of candidates) {
            if (semver.satisfies(c.version, range)) return c;
        }
        return null;
    }

    // DFS resolve
    function resolveId(id: string, requestedRange?: string, optional = false) {
        if (chosen.has(id)) return; // already resolved
        if (visiting.has(id)) throw new ResolveError(`cyclic dependency detected on '${id}'`);
        visiting.add(id);

        const manifest = pickVersion(id, requestedRange);
        if (!manifest) {
            if (optional) {
                visiting.delete(id);
                return; // leave unresolved
            }
            throw new ResolveError(`no available version for plugin '${id}' matching range '${requestedRange ?? '*'}'`);
        }

        // record choice
        chosen.set(id, manifest);

        // resolve its dependencies
        for (const dep of manifest.depends ?? []) {
            const depRange = dep.range;
            const depId = dep.id;
            try {
                resolveId(depId, depRange, Boolean(dep.optional));
            } catch (err) {
                // If dependency is optional, swallow
                if (dep.optional) continue;
                throw err;
            }
        }

        visiting.delete(id);
    }

    // Resolve roots
    for (const r of roots) resolveId(r, undefined, false);

    // Topologically sort chosen set
    const graph = new Map<string, Set<string>>(); // node -> deps
    for (const [id, manifest] of chosen.entries()) {
        const deps = new Set<string>();
        for (const d of manifest.depends ?? []) {
            if (chosen.has(d.id)) deps.add(d.id);
        }
        graph.set(id, deps);
    }

    // Kahn's algorithm
    const inDegree = new Map<string, number>();
    for (const id of graph.keys()) inDegree.set(id, 0);
    for (const deps of graph.values()) {
        for (const d of deps) inDegree.set(d, (inDegree.get(d) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) if (deg === 0) queue.push(id);

    const orderIds: string[] = [];
    while (queue.length) {
        queue.sort(); // deterministic ordering for nodes with 0 indegree
        const id = queue.shift()!;
        orderIds.push(id);
        for (const [node, deps] of graph.entries()) {
            if (deps.has(id)) {
                const newDeg = (inDegree.get(node) ?? 0) - 1;
                inDegree.set(node, newDeg);
                if (newDeg === 0) queue.push(node);
            }
        }
    }

    if (orderIds.length !== graph.size) {
        throw new ResolveError('unable to produce topological order; possible cycle');
    }

    // Convert ids to manifests with dependencies first
    const order = orderIds.map((id) => chosen.get(id)!) ;

    return { chosen, order };
}

/**
 * Safe resolver wrapper — returns resolver result when possible, otherwise
 * performs a deterministic fallback ordering using a root-first dependants traversal.
 * This ensures a usable install/load order even when a strict topological sort
 * cannot be produced (cycles).
 */
export function resolvePluginsWithFallback(
    available: PluginManifest[],
    roots: string[],
    opts: ResolveOptions = {},
): ResolveResult {
    try {
        return resolvePlugins(available, roots, opts);
    } catch (err) {
        // Build map of manifests by id (choose highest version per id deterministically)
        const byId = new Map<string, PluginManifest[]>();
        for (const m of available) {
            const list = byId.get(m.id) ?? [];
            list.push(m);
            byId.set(m.id, list);
        }
        for (const [id, list] of byId.entries()) {
            list.sort((a, b) => semver.rcompare(a.version, b.version));
        }

        const chosen = new Map<string, PluginManifest>();

        // Collect non-optional constraints for each id from available manifests
        const constraints = new Map<string, string[]>();
        for (const m of available) {
            for (const d of (m.depends ?? [])) {
                if (d.optional) continue;
                const arr = constraints.get(d.id) ?? [];
                arr.push(d.range);
                constraints.set(d.id, arr);
            }
        }

        // Choose a version per id. If constraints exist, pick highest candidate that
        // satisfies all constraints otherwise throw; if no constraints, pick highest.
        for (const [id, list] of byId.entries()) {
            const reqs = constraints.get(id);
            if (!reqs || reqs.length === 0) {
                if (list.length > 0) chosen.set(id, list[0]);
                continue;
            }
            // find first candidate that satisfies all required ranges
            let found: PluginManifest | null = null;
            for (const c of list) {
                let ok = true;
                for (const r of reqs) {
                    if (!semver.satisfies(c.version, r)) {
                        ok = false;
                        break;
                    }
                }
                if (ok) { found = c; break; }
            }
            if (!found) throw new ResolveError(`no available version for plugin '${id}' satisfying all required ranges`);
            chosen.set(id, found);
        }

        // Build dependency map (id -> set of dependencies)
        const depsMap = new Map<string, Set<string>>();
        for (const m of available) {
            const deps = new Set<string>();
            for (const d of (m.depends ?? [])) {
                if (chosen.has(d.id)) deps.add(d.id);
            }
            depsMap.set(m.id, deps);
        }

        // Dependency-first DFS post-order traversal: visit dependencies first, then node
        const visited = new Set<string>();
        const visitingLocal = new Set<string>();
        const orderIds: string[] = [];

        function visit(id: string) {
            if (visited.has(id)) return;
            if (visitingLocal.has(id)) {
                // cycle detected in traversal; break cycle deterministically by returning
                return;
            }
            visitingLocal.add(id);
            const deps = Array.from(depsMap.get(id) ?? []).sort();
            for (const d of deps) visit(d);
            visitingLocal.delete(id);
            visited.add(id);
            orderIds.push(id);
        }

        const rootsToUse = roots.length ? roots.slice() : Array.from(chosen.keys());
        rootsToUse.sort();
        for (const r of rootsToUse) visit(r);

        // Append any remaining ids deterministically (also dependency-first)
        const allIds = Array.from(chosen.keys()).sort();
        for (const id of allIds) if (!visited.has(id)) visit(id);

        const order = orderIds.map((id) => chosen.get(id)!).filter(Boolean);
        return { chosen, order };
    }
}

export default { resolvePlugins, ResolveError };
