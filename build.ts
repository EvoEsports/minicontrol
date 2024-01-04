await Bun.build({
    entrypoints: ['./app.ts'],
    root: './',
    outdir: './dist',
    sourcemap: 'external',   
    target: 'bun',
});

