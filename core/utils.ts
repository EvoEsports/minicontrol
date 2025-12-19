import tm from "tm-essentials";
import fs from "node:fs";
import log from "@core/log";

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function uuidv4(): string {
    // Generates a RFC4122 version 4 UUID
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export function isDeno() {
  return (
    typeof globalThis.Deno !== "undefined" && // Deno global exists
    typeof globalThis.Deno.version?.deno === "string" // Has version info
  );
}

export function processColorString(str: string, prefix = ""): string {
    let result = str;
    const matches = str.matchAll(/¤(\w+)¤/g);
    for (const match of matches) {
        const code = match[1].toString().toLowerCase();
        if (tmc.settings.colors[code]) {
            let color = tmc.settings.colors[code];
            if (color.length === 6) {
                color = `${color[0]}${color[2]}${color[4]}`;
            }
            result = result.replaceAll(match[0], `${prefix}$${color}`);
        }
    }
    return result;
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / chunkSize) }, (_, index) => array.slice(index * chunkSize, (index + 1) * chunkSize));
}

export function modLightness(color: string, percent: number) {
    let [h, s, l] = [0, 0, 0];

    if (color.length === 3) {
        const c = (str: string) => (Number.parseInt(str, 16) * 17) / 255;
        const [r, g, b] = color.split("");
        [h, s, l] = rgb2hsl(c(r), c(g), c(b));
    } else {
        const [r, g, b] = color.matchAll(/[0-9a-f]{2}/gi);
        [h, s, l] = rgb2hsl(Number.parseInt(r[0], 16) / 255, Number.parseInt(g[0], 16) / 255, Number.parseInt(b[0], 16) / 255);
    }
    let newL = l + percent / 100;
    if (newL > 1) newL = 1;
    if (newL < 0) newL = 0;
    return hsl2rgb(h, s, newL).join("");
}

export function hsl2rgb(h: number, s: number, l: number) {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    const cc = (nb: number) => Math.round(nb * 15).toString(16);
    return [cc(f(0)), cc(f(8)), cc(f(4))];
}

export function rgb2hsl(r: number, g: number, b: number) {
    const v = Math.max(r, g, b);
    const c = v - Math.min(r, g, b);
    const f = 1 - Math.abs(v + v - c - 1);
    const h = c && (v === r ? (g - b) / c : v === g ? 2 + (b - r) / c : 4 + (r - g) / c);
    return [60 * (h < 0 ? h + 6 : h), f ? c / f : 0, (v + v - c) / 2];
}
export function getCountryFromPath(path: string) {
    if (!path) return "World";
    if (path.indexOf("World|") === -1) return path;
    const pathSplit = path.split("|");
    if (tmc.game.Name === "TmForever") {
        return pathSplit[1] || pathSplit[0];
    }
    return pathSplit[2] || pathSplit[1] || pathSplit[0];
}

export function parseEntries(entries: any[]) {
    const out: { [key: string]: any } = {};
    for (const value of entries) {
        out[value.Name] = castType(value.Value);
    }
    return out;
}

export function htmlEntities(str: string): string {
    let val = (str || "").replace(/[\u00A0-\uFFFF<>&"']/g, (i) => `&#${i.charCodeAt(0)};`);
    val = val.replaceAll(/[$][lh]\[.*?](.*?)([$][lh])?/gi, "$1");
    val = val.replaceAll(/[$][lh]/gi, "");
    val = val.replaceAll("--", "-&#45;");
    return val;
}

export function removeLinks(str: string): string {
    return (str || "").replace(/[$][lh]\[.*?](.*?)([$][lh])?/i, "$1").replaceAll(/[$][lh]/gi, "");
}

export function removeColors(str: any): string {
    if (typeof str === "string") return tm.TextFormatter.deformat(str ?? "");
    return (str ?? "").toString();
}

export function clone(obj: any): any {
    if (obj === undefined || obj === null || typeof obj !== "object") return obj;
    return JSON.parse(JSON.stringify(obj));
}

export function formatTime(time: number, pretty = true, mainColor = "fff", secondary = "9ab"): string {
    if (time === undefined || time === null || Number.isNaN(time)) return `¤${mainColor}¤-:--.---`;
    if (time === Infinity) return "∞";
    if (time == 0) return pretty ? `-:--.---` : "-:--.---";
    const negative = time < 0;
    const msTotal = Math.floor(Math.abs(time));
    const ms = msTotal % 1000;
    const secondsTotal = Math.floor(msTotal / 1000);
    const seconds = secondsTotal % 60;
    const minutesTotal = Math.floor(secondsTotal / 60);
    const minutes = minutesTotal % 60;
    const hours = Math.floor(minutesTotal / 60);

    const isTmForever = typeof tmc !== "undefined" && tmc.game && tmc.game.Name === "TmForever";
    let msStr: string;
    if (isTmForever) {
        // two first digits of milliseconds
        msStr = String(Math.floor(ms / 10)).padStart(2, "0");
    } else {
        msStr = String(ms).padStart(3, "0");
    }

    const secStr = String(seconds).padStart(2, "0");
    const minStr = String(minutes).padStart(2, "0"); // hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
    let parsedTime = "";
    if (hours > 0) parsedTime = `${hours}:${minStr}:${secStr}.${msStr}`;
    else parsedTime = `${minStr}:${secStr}.${msStr}`;
    if (negative) parsedTime = `-${parsedTime}`;

    if (!pretty) return parsedTime;

    // Pretty coloring: leading zeros use secondary color, rest use main color.
    // Additionally, color leading ':' separators with secondary color if secondary is set.
    let out = "";
    let currentColor = "";
    let seenNonZero = false;
    for (let i = 0; i < parsedTime.length; i++) {
        const ch = parsedTime[i];
        let desiredColor = `$${mainColor}`;
        if (ch >= "0" && ch <= "9") {
            if (!seenNonZero && ch === "0") {
                desiredColor = `$${secondary}`;
            } else {
                desiredColor = `$${mainColor}`;
            }
            if (ch !== "0") seenNonZero = true;
        } else if (ch === ':' && !seenNonZero && secondary) {
            // leading colon separator -> secondary color
            desiredColor = `$${secondary}`;
        } else {
            desiredColor = `$${mainColor}`;
        }
        if (desiredColor !== currentColor) {
            out += desiredColor;
            currentColor = desiredColor;
        }
        out += ch;
    }
    return out;
}

export function castType(value: string, type?: string): any {
    if (type !== undefined) {
        if (type === "string") return value;
        if (type === "int") return Number.parseInt(value);
        if (type === "float") return Number.parseFloat(value);
        if (type === "number") {
            if (value.indexOf(".") !== undefined) return Number.parseFloat(value);
            return Number.parseInt(value);
        }
        if (type === "bool" || type === "boolean") return value === "true" || value === "1";
        if (type === "array") return value.split(",");
        console.log(`Unknown type: ${type}`);
        return null;
    }

    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "null") return null;
    if (!Number.isNaN(Number.parseFloat(value))) {
        if (value.includes(" ")) return value;
        if (value.includes(".")) return Number.parseFloat(value);
        return Number.parseInt(value);
    }
    return value;
}

let prevValueMem = -1;
export let startValueMem = 0;

/**
 * @ignore
 */
export function setMemStart() {
    startValueMem = process.memoryUsage().rss / 1048576;
}

export function memInfo(section = "") {
    const memMB = process.memoryUsage().rss / 1048576;
    let prefix = "$f22+";
    if (memMB < startValueMem) {
        prefix = "$0f0-";
    }
    const sectionInfo = section !== "" ? `¤info¤${section} ` : "";
    const out = `${sectionInfo} ¤info¤Mem: $fff${memMB.toFixed(1)}Mb ¤info¤Diff: ${prefix}${Math.abs(memMB - startValueMem).toFixed(1)}Mb`;
    prevValueMem = memMB;
    return processColorString(out);
}

export function isDocker() {
    const hasEnv = () => {
        try {
            fs.statSync("/.dockerenv");
            return true;
        } catch {
            return false;
        }
    };
    const hasGroup = () => {
        try {
            return fs.readFileSync("/proc/self/cgroup", "utf8").includes("docker");
        } catch {
            return false;
        }
    };

    return hasEnv() || hasGroup();
}

export function getCallerName() {
    // Get stack array
    const orig = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, stack) => stack;
    const { stack } = new Error();
    Error.prepareStackTrace = orig;
    if (stack) {
        const caller: any = stack[2];
        if (caller) {
            log.debug(
                `$fff└ $4cb${caller.getTypeName()}$fff.$eea${caller.getMethodName()}$fb1()    $333vscode://vscode-remote/wsl+ubuntu/${caller
                    .getFileName()
                    .replace("file:///", "")}:${caller.getLineNumber()}`,
            );
        }
    }
}

export function escapeRegex(text: string) {
    return text.replaceAll(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export function loginToUuid(login: string) {
    return Buffer.from(login, "base64").toString("hex").replace(/([0-z]{8})([0-z]{4})([0-z]{4})([0-z]{4})([0-z]{12})/, "$1-$2-$3-$4-$5");
}

export function uuidToLogin(uuid: string) {
    return Buffer.from(uuid.replaceAll("-", ""), "hex").toString("base64url");
}