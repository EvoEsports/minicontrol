import { writeFileSync, readFileSync, existsSync } from 'fs';
import { modLightness } from './utils';

export default class SettingsManager {
    _defaultSettings: { [key: string]: any } = {};
    settings: { [key: string]: any } = {};
    _defaultColors: { [key: string]: string } = {
        white: "fff",
        gray: "abc",
        black: "000",
        primary: "9f0",
        secondary: "f90",
        title_fg: "fff",
        title_bg: "334",
        widget_bg: "000",
        widget_text: "fff",
        window_bg: "223",
        window_text: "fff",
        button_bg: "778",
        button_bg_hover: "679",
        button_text: "fff",
        cmd: "fd0",
        info: "5bf",
        rec: "2e0",
        success: "0f0",
        warning: "fa0",
        error: "f00",
    };
    admins: string[] = [];
    masterAdmins: string[] = (process.env.ADMINS || "").split(",").map((a) => a.trim());
    colors: { [key: string]: string } = this._defaultColors;

    load() {
        this.admins = this.masterAdmins;
        this.settings = this._defaultSettings;
        /** load colors from environment variables */
        for (const color in this._defaultColors) {
            const vari = "COLOR_" + color.toString().toUpperCase();
            this.colors[color] = process.env[vari] || this._defaultColors[color];
        }
        this.colors['button_bg_light'] = modLightness(this.colors['button_bg'], 15);
        this.colors['button_bg_dark'] = modLightness(this.colors['button_bg'], -15);
        this.colors['window_bg_light'] = modLightness(this.colors['window_bg'], 5);
        this.colors['window_bg_dark'] = modLightness(this.colors['window_bg'], -5);

        if (existsSync(import.meta.dirname + "/../userdata/admins.json")) {
            try {
                const admins = JSON.parse(readFileSync(import.meta.dirname + "/../userdata/admins.json", "utf-8")) || [];
                this.admins = admins.concat(this.masterAdmins);
            } catch (e: any) {
                tmc.cli("$f00Error while loading admins.json");
                tmc.cli(e.message);
                process.exit();
            }
        }
        if (existsSync(import.meta.dirname + "/../userdata/settings.json")) {
            try {
                this.settings = Object.assign({}, this._defaultSettings, JSON.parse(readFileSync(import.meta.dirname+ "/../userdata/settings.json", "utf-8")) || {});
            } catch (e: any) {
                tmc.cli("$f00Error loading settings.json");
                tmc.cli(e.message);
                process.exit();
            }
        }
        if (existsSync(import.meta.dirname+ "/../userdata/colors.json")) {
            try {
                const colors = JSON.parse(readFileSync(import.meta.dirname+ "/../userdata/colors.json", "utf-8")) || {};
                this.colors = Object.assign({}, this._defaultColors);
                for (const color in colors) {
                    this.colors[color] = colors[color];
                }
            } catch (e: any) {
                tmc.cli("$f00Error loading colors.json");
                tmc.cli(e.message);
                process.exit();
            }
        }
    }

    save() {
        try {
            const outSettings: any = {};
            for (const key in this.settings) {
                if (this.settings[key] !== this._defaultSettings[key]) {
                    outSettings[key] = this.settings[key];
                }
            }
            writeFileSync(import.meta.dirname+ "/../userdata/settings.json", JSON.stringify(outSettings));
            const colors: any = {};
            for (const color in this.colors) {
                if (this.colors[color] !== this._defaultColors[color]) {
                    colors[color] = this.colors[color];
                }
            }
            writeFileSync(import.meta.dirname+ "/../userdata/colors.json", JSON.stringify(colors));
            writeFileSync(import.meta.dirname+ "/../userdata/admins.json", JSON.stringify(this.admins.filter((a) => !this.masterAdmins.includes(a))));
        } catch (e: any) {
            tmc.cli("¤error¤Error while saving settings!");
            tmc.cli(e.message);
        }
    }


    register(key: string, value: any) {
        this._defaultSettings[key] = value;
        this.settings[key] = value;
    }

    get(key: string) {
        return this.settings[key] || this._defaultSettings[key];
    }

    getDefault(key: string) {
        return this._defaultSettings[key];
    }

    set(key: string, value: any) {
        this.settings[key] = value;
        this.save();
    }

    getColor(key: string) {
        return this.colors[key] || "fff";
    }


    getDefaultColor(key: string) {
        return this._defaultColors[key];
    }

    setColor(key: string, value: any) {
        this.settings[key] = value;
        this.save();
    }

    addAdmin(login: string) {
        if (this.admins.includes(login)) {
            tmc.cli("¤error¤Trying to add admin that already exists!");
            return;
        }
        this.admins.push(login);
        this.save();
    }

    removeAdmin(login: string) {
        if (this.masterAdmins.includes(login)) {
            tmc.cli("¤error¤Cannot remove master admin!");
            return;
        }
        this.admins = this.admins.filter((a) => a !== login || this.masterAdmins.includes(a));
        this.save();
        this.admins = this.admins.concat(this.masterAdmins);
    }

    async delete(key: string) {
        delete this.settings[key];
        this.save();
    }
}