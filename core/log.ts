import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { rgb2hsl, removeColors, processColorString } from "./utils";

// Precompile regex and constants to avoid recreating per-call
const TM_COLOR_SPLIT_RE = /([$][0-9A-F]{3}|[$][zsowin])/gi;
const ansi_esc = String.fromCharCode(0x1b);
// Sector to ANSI lookup (module-level to reduce allocations)
// Sectors centre on 0,60,120,180,240,300 degrees and map to 4-bit ANSI color codes
// Order: [red, yellow, green, cyan, blue, magenta]
const SECTOR_TO_ANSI = [1, 3, 2, 6, 4, 5] as const;

interface LogLine {
    date: string;
    level: string;
    message: string;
}

export let logLines: LogLine[] = [];

/**
* Formats values to pretty printed string
 *
 * @param value - value to format
 * @param indentLevel  - ident level 0-n
 * @param seen - is the value seen
 * @param formatString - add string formatting
 * @returns pretty printed string
 */
function formatValue(value: unknown, indentLevel = 0, seen = new Set<unknown>(), formatString = false): string {
    const indent = "  ".repeat(indentLevel);
    const nextIndent = "  ".repeat(indentLevel + 1);

    if (value === null) return "$59dnull";
    if (value === undefined) return "$59dundefined";
    if (typeof value === "number" || typeof value === "bigint" || typeof value === "symbol") {
        return "$dd8" + String(value) + "$z";
    }
    if (typeof value === "boolean") {
        return "$59d" + String(value) + "$z";
    }

    if (typeof value === "string") {
        if (formatString) {
            return `$c97"${value}"$z`;
        }
        return value;
    }
    if (Array.isArray(value)) {
        if (value.length === 0) return "[]";
        const items = value.map((item) => `${nextIndent}- ${formatValue(item, indentLevel + 1, seen, true)}`);
        return `[Array]\n$c8c[$z
${items.join("\n")}
${indent}$c8c]$z`;
    }

    if (typeof value === "object") {
        if (seen.has(value)) {
            return "[Circular]";
        }
        seen.add(value);

        const entries = Object.entries(value as Record<string, unknown>);
        if (entries.length === 0) {
            seen.delete(value);
            return "$z{}";
        }

        const lines = entries.map(([key, val]) => `${nextIndent}$9df${key}$z: ${formatValue(val, indentLevel + 1, seen, true)},`);
        seen.delete(value);
        return `[Object] $z{
${lines.join("\n")}
${indent}$z}`;
    }

    return String(value);
}

export function Tm2Console(input: string, ansiLevel = 0) {
    if (ansiLevel === 0) return removeColors(input);

    const chunks = input.split(TM_COLOR_SPLIT_RE);
    const colorize = (str: string) => {
        const c = (str: string) => (Number.parseInt(str, 16) * 17) / 255;
        if (!str.startsWith("$")) return str;
        if (str === "$n" || str === "$m") return "";
        if (str === "$z") return `${ansi_esc}[0m`;
        if (str === "$s") return ``;
        if (str === "$i") return ``;
        if (str.match(/[$][obw]/gi)) return `${ansi_esc}[1m`;

        const [r, g, b] = str.replace("$", "").split("");
        const [hRaw, s, l] = rgb2hsl(c(r), c(g), c(b));
        // Normalize hue to 0..360 and compute centred sector mapping for ANSI 4-bit colors
        const hue = ((hRaw % 360) + 360) % 360;
        const sector = Math.floor(((hue + 30) % 360) / 60); // centers sectors on 0,60,120... degrees
        let ansi: number;
        // Precompute perceived luminance used for brightness decisions
        const cc = (str: string) => Number.parseInt(str, 16) * 17;
        const toLinear = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        const r8 = cc(r);
        const g8 = cc(g);
        const b8 = cc(b);
        const lr = toLinear(r8 / 255);
        const lg = toLinear(g8 / 255);
        const lb = toLinear(b8 / 255);
        const luminance = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb; // 0..1
        // Map 6 sectors to 4-bit ANSI color codes in a consistent order (red, yellow, green, cyan, blue, magenta)
        ansi = SECTOR_TO_ANSI[sector] ?? 0;
        // If low saturation, map to grayscale depending on luminance (compute later)
        let prefix = 3;
        // Use perceived luminance to determine bright (ANSI bright) vs normal
        if (luminance >= 0.44) prefix = 9;
        // Very bright -> map directly to white
        if (luminance >= 0.93) {
            prefix = 9;
            ansi = 7;
        }
        if (luminance < 0.02) {
            prefix = 9; // normal
            ansi = 0; // black
        }
        if (s < 0.25) {
            // low saturation -> map to grayscale using perceived luminance
            if (luminance <= 0.10) {
                prefix = 9; // bright
                ansi = 0; // black
            } else if (luminance <= 0.55) {
                prefix = 3; // normal
                ansi = 7; // light gray
            } else {
                prefix = 9; // bright
                ansi = 7; // white
            }
        }
        return ansiLevel > 1 ? `${ansi_esc}[38;2;${cc(r)};${cc(g)};${cc(b)}m` : `${ansi_esc}[${prefix}${ansi}m`;
    };

    return `${chunks
        .map((str) => {
            return str.startsWith("$") ? colorize(str) : str;
        })
        .join("") + ansi_esc
        }[0m`;
}

// Initialize log directory on module load
const logPath = `${process.cwd()}/userdata/log/`;
try {
    if (!existsSync(logPath)) mkdirSync(logPath);
} catch (e: any) {
    console.log(e.message);
    process.exit(1);
}

// Cache ansi level and formatter at module load
const ansiLevel = Number.parseInt(process.env.ANSILEVEL || "0");
const formatter: (str: string) => string =
    ansiLevel === 0 ? (s) => removeColors(s) :
        ansiLevel === 1 ? (s) => Tm2Console(s, 1) :
            (s) => Tm2Console(s, 2);

function writeLog(message: unknown, level: "INFO" | "WARN" | "ERROR" | "DEBUG" = "INFO") {
    const date = new Date();
    logLines.push({ date: date.toISOString().slice(11), level, message: formatValue(message) });
    tmc.server.emit("TMC.Console", {});
    if (logLines.length > 1000) {
        logLines.shift(); // Removes the oldest item (at index 0)
    }

    if (process.env.WRITELOG?.toLowerCase() !== "true") return;

    // ISO date in filename (YYYY-MM-DD) standard
    const fileDate = date.toISOString().slice(0, 10);
    const file = `${fileDate}_console.log`;
    // Compose a standardized line: timestamp level message
    const line = `${date.toISOString()} [${level}] ${removeColors(message)}\n`;
    try {
        appendFileSync(`${process.cwd()}/userdata/log/${file}`, line, { encoding: "utf-8" });
    } catch (err: any) {
        /* ignore */
    }
}

export function debug(str: unknown) {
    console.log((formatter(processColorString(formatValue(str)))));
    writeLog(str, "DEBUG");
}

export function info(str: unknown) {
    const date = new Date();
    const prefix = `$888[${date.toISOString()}] $z`;
    console.log(formatter(prefix) + formatter(processColorString(formatValue(str))));
    writeLog(str, "INFO");
}

export function warn(str: unknown) {
    console.log(formatter(processColorString(formatValue(str))));
    writeLog(str, "WARN");
}

export function error(str: unknown) {
    console.log(formatter(processColorString(formatValue(str))));
    writeLog(str, "ERROR");
}

// Default export for backward compatibility
export default { debug, info, warn, error };
