import chalk from "chalk";
import { rgb2hsl } from "./utils";

function Tm2Console(input: string, ansi256: boolean = false) {
    const chunks = input.split(/([$][0-9A-F]{3}|[$][zsowin])/gi);
    const ansi_esc = String.fromCharCode(0x1b);
    //const ansi_esc = ``;
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
        let ansi = 0;
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
        return ansi256
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
    Level: number = 0;
    constructor() {
        this.Level = chalk.Level;
        if (Boolean(process.env.ANSI256)) {
            this.Level = 2;
        }
    }
    debug(str: string) {
        console.log(Tm2Console(str, this.Level > 1));
    }
    info(str: string) {
        console.log(Tm2Console(str, this.Level > 1));
    }
    warn(str: string) {
        console.log(Tm2Console(str, this.Level > 1));
    }
    error(str: string) {
        console.log(Tm2Console(str, this.Level > 1));
    }
}

export default new log();
