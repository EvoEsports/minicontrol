import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { rgb2hsl, removeColors } from "./utils";

// Precompile regex and constants to avoid recreating per-call
const TM_COLOR_SPLIT_RE = /([$][0-9A-F]{3}|[$][zsowin])/gi;
const ansi_esc = String.fromCharCode(0x1b);
// Sector to ANSI lookup (module-level to reduce allocations)
// Sectors centre on 0,60,120,180,240,300 degrees and map to 4-bit ANSI color codes
// Order: [red, yellow, green, cyan, blue, magenta]
const SECTOR_TO_ANSI = [1, 3, 2, 6, 4, 5] as const;

export function Tm2Console(input: string, ansiLevel = 0) {
    if (ansiLevel === 0) return removeColors(input);

    const chunks = input.split(TM_COLOR_SPLIT_RE);
    const colorize = (str: string) => {
        const c = (str: string) => (Number.parseInt(str, 16) * 17) / 255;
        if (!str.startsWith("$")) return str;
        if (str === "$n") return "";
        if (str === "$z") return `${ansi_esc}[0m`;
        if (str === "$s") return `${ansi_esc}[0m`;
        if (str === "$i") return `${ansi_esc}[3m`;
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

class log {
    ansiLevel = 0;
    formatter: (str: string) => string; // function to convert color codes to ANSI/stripped text based on ANSILEVEL
    constructor() {
        this.ansiLevel = Number.parseInt(process.env.ANSILEVEL || "0");
        const path = `${process.cwd()}/userdata/log/`;
        try {
            if (!existsSync(path)) mkdirSync(path);
        } catch (e: any) {
            console.log(e.message);
            process.exit(1);
        }
        // initialize the formatter function according to ansi level once
        if (this.ansiLevel === 0) this.formatter = (s) => removeColors(s);
        else if (this.ansiLevel === 1) this.formatter = (s) => Tm2Console(s, 1);
        else this.formatter = (s) => Tm2Console(s, 2);
    }

    debug(str: string) {
        console.log(this.formatter(str));
        // write debug messages to disk only when WRITELOG + DEBUG are enabled
        if (process.env.WRITELOG?.toLowerCase() === "true" && process.env.DEBUG === "true") {
            this.writeLog(str, "DEBUG");
        }
    }

    info(str: string) {
        const date = new Date();
        const message = `$888[${date.toISOString()}] $z${str}`;
        console.log(this.formatter(message));
        this.writeLog(str, "INFO");
    }

    warn(str: string) {
        console.log(this.formatter(str));
        this.writeLog(str, "WARN");
    }

    error(str: string) {
        console.log(this.formatter(str));
        this.writeLog(str, "ERROR");
    }

    writeLog(message: string, level: "INFO" | "WARN" | "ERROR" | "DEBUG" = "INFO") {
        if (process.env.WRITELOG?.toLowerCase() !== "true") return;
        const date = new Date();
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
}

export default new log();
