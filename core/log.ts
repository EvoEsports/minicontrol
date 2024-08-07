import { rgb2hsl, removeColors } from "./utils";

function Tm2Console(input: string, ansilevel: number = 0) {
    if (ansilevel == 0) return removeColors(input);

    const chunks = input.split(/([$][0-9A-F]{3}|[$][zsowin])/gi);
    const ansi_esc = String.fromCharCode(0x1b);
    const colorize = (str: string) => {
        const c = (str: string) => (parseInt(str, 16) * 17) / 255;
        if (!str.startsWith("$")) return str;
        if (str == "$n") return "";
        if (str == "$z") return ansi_esc + "[0m";
        if (str == "$s") return ansi_esc + "[0m";
        if (str == "$i") return ansi_esc + "[3m";
        if (str.match(/[$][obw]/gi)) return ansi_esc + "[1m";


        const [r, g, b] = str.replace("$", "").split("");
        const [h, s, l] = rgb2hsl(c(r), c(g), c(b));
        let ansi: number;
        switch (Math.round(((h - 10) % 360) / 60)) {
            case 0:
                ansi = 1;
                break;
            case 1:
                ansi = 3;
                break;
            case 2:
                ansi = 2;
                break;
            case 3:
                ansi = 6;
                break;
            case 4:
                ansi = 4;
                break;
            case 5:
                ansi = 5;
                break;
            default:
                ansi = 9;
                break;
        }
        if (s < 0.25) ansi = 0;
        let prefix = 3;
        if (l > 0.5) prefix = 9;
        if (l > 0.9) {
            prefix = 9;
            ansi = 7;
        }
        const cc = (str: string) => parseInt(str, 16) * 17;
        return ansilevel > 1
            ? ansi_esc + `[38;2;${cc(r)};${cc(g)};${cc(b)}m`
            : ansi_esc + `[${prefix}${ansi}m`;
    };

    return (
        chunks
            .map((str) => {
                return str.startsWith("$") ? colorize(str) : str;
            })
            .join("") +
        ansi_esc +
        "[0m"
    );
}

class log {
    ansiLevel: number = 0;
    constructor() {
        this.ansiLevel = Number.parseInt(process.env.ANSILEVEL || "0");
    }

    debug(str: string) {
        console.log(Tm2Console(str, this.ansiLevel));
    }
    info(str: string) {
        const date = new Date();
        console.log(Tm2Console(`$555[${date.toISOString()}] $z` + str, this.ansiLevel));
    }
    warn(str: string) {
        console.log(Tm2Console(str, this.ansiLevel));
    }
    error(str: string) {
        console.log(Tm2Console(str, this.ansiLevel));
    }
}

export default new log();
