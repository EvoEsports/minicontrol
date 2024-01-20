await Bun.build({    
    entrypoints: ['./core/minicontrol.ts'],
    root: '.',
    outdir: './dist',
    target: 'bun',
    external: ['core/plugins/*'],
    format: "esm",
    minify: true,    
});
