import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { resolvePluginsWithFallback } from '../core/plugins/resolver';
import { validateManifest } from '../core/plugins/schema';

async function main() {
    // Load local manifests for records and database
    const root = path.resolve(process.cwd(), 'core', 'plugins');
    const ids = ['records', 'database'];
    const manifests = [] as any[];
    for (const id of ids) {
        const mf = path.join(root, id, 'manifest.json');
        if (!fs.existsSync(mf)) throw new Error(`missing ${mf}`);
        const raw = await fsp.readFile(mf, 'utf8');
        const obj = JSON.parse(raw);
        if (!validateManifest(obj)) throw new Error(`invalid manifest for ${id}`);
        manifests.push(obj);
    }

    try {
        const res = resolvePluginsWithFallback(manifests, ['records']);
        console.log('Resolver returned unexpectedly:', res);
        process.exit(1);
    } catch (e: any) {
        console.log('Resolver failed as expected:', e.message || e);
        process.exit(0);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
