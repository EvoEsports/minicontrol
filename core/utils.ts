import tm from 'tm-essentials';

export let colors: { [key: string]: string } = {
    white: "fff",
    black: "000",
    title_fg: "eef",
    title_bg: "112", //27f
    bg: "334",
    cmd: "fd0",
    info: "5bf",
    rec: "2e0",
    success: "0f0",
    warning: "fa0",
    error: "f00",
    gray: "abc",
    button: "778",
    button_hover: "27f",
};

/** load colors from environment variables */
for (let color in colors) {
    const vari = "COLOR_" + color.toString().toUpperCase();
    colors[color] = process.env[vari] || colors[color];
}

colors['button_light'] = modLightness(colors['button'], 15);
colors['button_dark'] = modLightness(colors['button'], -15);
colors['bg_light'] = modLightness(colors['bg'], 5);
colors['bg_dark'] = modLightness(colors['bg'], -5);

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
        if (colors[code]) {
            str = str.replaceAll(match[0], `${prefix}$${colors[code]}`);
        }
    }
    return str;
}

export function modLightness(color: string, percent: number) {
    const c = (str: string) => (parseInt(str, 16) * 17) / 255;
    const [r, g, b] = color.split("");
    const [h, s, l] = rgb2hsl(c(r), c(g), c(b));
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

export function escape(str: string): string {
    return (str || "").replaceAll(/&/g, "&amp;").replaceAll(/</g, "&lt;").replaceAll(/>/g, "&gt;").replaceAll(/"/g, "&quot;").replaceAll(/'/g, "&apos;")
        .replace(/[$][lh]\[.*?](.*?)([$][lh])?/i, "$1").replaceAll(/[$][lh]/gi, "").replaceAll("--", "—-").replaceAll("]]>", "]>");
}

export function removeLinks(str: string): string {
    return (str || "").replace(/[$][lh]\[.*?](.*?)([$][lh])?/i, "$1").replaceAll(/[$][lh]/gi, "")
}

export function removeColors(str: string): string {
    return tm.TextFormatter.deformat(str || "");
}

export function clone(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
}

export function formatTime(time: number): string {
    return tm.Time.fromMilliseconds(time).toTmString().replace(/^0:/, "");
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

export function memInfo(section = "") {
    const memMB = (process.memoryUsage().rss / 1048576);
    let prefix = "$f22 +";
    if (memMB < prevValueMem) {
        prefix = "$0f0 -";
    }
    section = (section != "") ? `¤info¤${section} ` : "";
    const out = section + "$fff" + memMB.toFixed(1) + "Mb " + prefix + Math.abs(memMB - prevValueMem).toFixed(1) + 'Mb $fff(' + (memMB - startValueMem).toFixed(1) + "Mb)";
    prevValueMem = memMB;
    return out;
}