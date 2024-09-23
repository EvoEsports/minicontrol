import tm from 'tm-essentials';
import fs from 'fs';
import log from '@core/log';

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function processColorString(str: string, prefix: string = ""): string {
    const matches = str.matchAll(/¤(\w+)¤/g);
    for (let match of matches) {
        const code = match[1].toString().toLowerCase();
        if (tmc.colors[code]) {
            str = str.replaceAll(match[0], `${prefix}$${tmc.colors[code]}`);
        }
    }
    return str;
}
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = Array.from({ length: Math.ceil(array.length / chunkSize) }, (_, index) =>
        array.slice(index * chunkSize, (index + 1) * chunkSize)
);
return chunks;
}

export function modLightness(color: string, percent: number) {
    let [h, s, l] = [0, 0, 0];

    if (color.length == 3) {
        const c = (str: string) => (parseInt(str, 16) * 17) / 255;
        let [r, g, b] = color.split("");
        [h, s, l] = rgb2hsl(c(r), c(g), c(b));
    } else {
        let [r, g, b] = color.matchAll(/[0-9a-f]{2}/gi);
        [h, s, l] = rgb2hsl(parseInt(r[0], 16) / 255, parseInt(g[0], 16) / 255, parseInt(b[0], 16) / 255);
    }
    let newL = l + (percent / 100);
    if (newL > 1) newL = 1.;
    if (newL < 0) newL = 0.;
    return hsl2rgb(h, s, newL).join("");
}

export function hsl2rgb(h: number, s: number, l: number) {
    let a = s * Math.min(l, 1 - l);
    let f = (n: number, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    const cc = (nb: number) => Math.round(nb * 15).toString(16);
    return [cc(f(0)), cc(f(8)), cc(f(4))];
}

export function rgb2hsl(r: number, g: number, b: number) {
    let v = Math.max(r, g, b),
    c = v - Math.min(r, g, b),
    f = 1 - Math.abs(v + v - c - 1);
    let h =
    c && (v == r ? (g - b) / c : v == g ? 2 + (b - r) / c : 4 + (r - g) / c);
    return [60 * (h < 0 ? h + 6 : h), f ? c / f : 0, (v + v - c) / 2];
}

export function parseEntries(entries: any[]) {
    let out: { [key: string]: any } = {};
    for (const value of entries) {
        out[value.Name] = castType(value.Value);
    }
    return out;
}


export function escape(str: string): string {
    return (str || "").replaceAll(/&/g, "&amp;").replaceAll(/</g, "&lt;").replaceAll(/>/g, "&gt;").replaceAll(/"/g, "&quot;").replaceAll(/'/g, "&apos;")
    .replace(/[$][lh]\[.*?](.*?)([$][lh])?/i, "$1").replaceAll(/[$][lh]/gi, "").replaceAll("--", "—-").replaceAll("]]>", "]>");
}

export function removeLinks(str: string): string {
    return (str || "").replace(/[$][lh]\[.*?](.*?)([$][lh])?/i, "$1").replaceAll(/[$][lh]/gi, "")
}

export function removeColors(str: any): string {
    if (typeof str == "string")
        return tm.TextFormatter.deformat(str ?? "");
    return (str ?? "").toString();
}

export function clone(obj: any): any {
    if (obj === undefined || obj === null || typeof obj !== "object") return obj;
    return JSON.parse(JSON.stringify(obj));
}

export function formatTime(time: number): string {
    let parsedTime = tm.Time.fromMilliseconds(time).toTmString();
    if (tmc.game.Name == "TmForever")
        return parsedTime.replace(/0$/, "");
    return parsedTime;
}

export function castType(value: string, type: string | undefined = undefined): any {
    if (type !== undefined) {
        if (type == "string") return value;
        else if (type == "int") return Number.parseInt(value);
        else if (type == "float") return Number.parseFloat(value);
        else if (type == "number") {
            if (value.indexOf(".") !== undefined) return Number.parseFloat(value);
            else return Number.parseInt(value);
        }
        else if (type == "bool" || type == "boolean") return (value == "true");
        else if (type == "array") return value.split(",");
        else {
            console.log("Unknown type: " + type);
            return null;
        }
    }

    if (value == "true") return true;
    else if (value == "false") return false;
    else if (value == "null") return null;
    else if (!isNaN(Number.parseFloat(value))) {
        if (value.includes(".")) return Number.parseFloat(value)
            else return Number.parseInt(value);
    }
    else {
        return value;
    }
}

let prevValueMem: number = -1;
let startValueMem: number = (process.memoryUsage().rss / 1048576);

/**
* @ignore
*/
export function setMemStart() {
    startValueMem = (process.memoryUsage().rss / 1048576);
}

export function memInfo(section = "") {
    const memMB = (process.memoryUsage().rss / 1048576);
    let prefix = "$f22+";
    if (memMB < startValueMem) {
        prefix = "$0f0-";
    }
    section = (section != "") ? `¤info¤${section} ` : "";
    const out = section + " ¤white¤Start:" + (startValueMem).toFixed(1) + "Mb  Curr:" + memMB.toFixed(1) + "Mb  Diff:" + prefix + Math.abs(memMB - startValueMem).toFixed(1) + 'Mb';
    prevValueMem = memMB;
    return processColorString(out);
}

export function isDocker() {
    const hasEnv = () => {
        try {
            fs.statSync('/.dockerenv');
            return true;
        } catch {
            return false;
        }
    };
    const hasGroup = () => {
        try {
            return fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker');
        } catch {
            return false;
        }
    }

    return hasEnv() || hasGroup();
}

export function getCallerName() {
    // Get stack array
    const orig = Error.prepareStackTrace;
    Error.prepareStackTrace = (error, stack) => stack;
    const { stack } = new Error();
    Error.prepareStackTrace = orig;
    if (stack) {
        const caller:any = stack[2];
        if (caller) {
            log.debug("$fff└ $4cb"+caller.getTypeName()+"$fff.$eea"+caller.getMethodName() + "$fb1()    $333vscode://vscode-remote/wsl+ubuntu/"+caller.getFileName().replace("file:///", "")+":"+caller.getLineNumber());
        }
    }
}

export function escapeRegex(text: string) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
 }