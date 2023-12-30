
let prevValue:number = -1;
let startValue:number = (process.memoryUsage().rss / 1048576);

function tickHeapDump() {
    setImmediate(function () {
        let memMB = (process.memoryUsage().rss / 1048576);
        if (prevValue != memMB) {
            let prefix = "$d00▲ +";
            if (memMB < prevValue) {
                prefix = "$0d0▼ -";
            }
            tmc.cli("$aaaMem Current: $fff" + memMB.toFixed(1) + "Mb " + prefix +  Math.abs(memMB - prevValue).toFixed(1) + 'Mb $aaa(' + (memMB - startValue).toFixed(1) + "Mb)");
            prevValue = memMB;
        }
    });
}

tickHeapDump();
setInterval(() => {
    tickHeapDump();
}, 10000);
