import PluginLoader from '../core/plugins/loader';

async function main() {
    const loader = new PluginLoader();
    const discovered = await loader.discover();
    console.log('Discovered manifests:');
    for (const d of discovered) {
        if (d.manifest) console.log(` - ${d.manifest.id}@${d.manifest.version}`);
    }

    console.log('\nAttempting to load records plugin (should fail if database version incompatible)');
    try {
        await loader.load('records');
        console.log('Load succeeded — this is unexpected if database version is >1.0.0.');
    } catch (err: any) {
        console.error('Load failed as expected:', err.message || err);
        process.exit(0);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
