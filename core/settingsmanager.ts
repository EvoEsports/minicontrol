import { writeFileSync, readFileSync, existsSync } from 'fs';
import { clone, modLightness } from './utils';
import type { init } from '@sentry/node';

export default class SettingsManager {
    _defaultSettings: { [key: string]: any } = {};
    settings: { [key: string]: any } = {};
    _defaultColors: { [key: string]: string } = {
        white: 'fff',
        gray: 'abc',
        black: '000',
        primary: '9f0',
        secondary: 'f90',
        title_fg: 'fff',
        title_bg: '09c',
        widget_bg: '012',
        widget_text: 'fff',
        window_bg: '123',
        window_text: 'fff',
        button_bg: '778',
        button_bg_hover: '679',
        button_text: 'fff',
        cmd: 'fd0',
        info: '5bf',
        rec: '2e0',
        success: '0f0',
        warning: 'fa0',
        error: 'f00'
    };
    colors: { [key: string]: string } = this._defaultColors;
    callbacks: { [key: string]: null | ((value: any, oldValue: any) => Promise<void>) } = {};
    descriptions: { [key: string]: string } = {};
    colorDescriptions: { [key: string]: string } = {};

    admins: string[] = [];
    masterAdmins: string[] = (process.env.ADMINS || '').split(',').map((a) => a.trim());

    adminsFile: string = '/../userdata/admins.json';
    colorsFile: string = '/../userdata/colors.json';
    settingsFile: string = '/../userdata/settings.json';

    load() {
        tmc.cli('¤info¤Loading settings...');
        this.admins = this.masterAdmins;
        this.settings = this._defaultSettings;
        /** load colors from environment variables */
        for (const color in this._defaultColors) {
            const envVar = 'COLOR_' + color.toString().toUpperCase();
            this.colors[color] = process.env[envVar] || this._defaultColors[color];
        }
        this.colors['button_bg_light'] = modLightness(this.colors['button_bg'], 15);
        this.colors['button_bg_dark'] = modLightness(this.colors['button_bg'], -15);
        this.colors['window_bg_light'] = modLightness(this.colors['window_bg'], 5);
        this.colors['window_bg_dark'] = modLightness(this.colors['window_bg'], -5);
        this.adminsFile = '/../userdata/admins_' + tmc.server.login + '.json';
        this.colorsFile = '/../userdata/colors_' + tmc.server.login + '.json';
        this.settingsFile = '/../userdata/settings_' + tmc.server.login + '.json';

        this.init(this.adminsFile, []);
        this.init(this.colorsFile, {});
        this.init(this.settingsFile, {});

        try {
            const admins = JSON.parse(readFileSync(import.meta.dirname + this.adminsFile, 'utf-8')) || [];
            this.admins = admins.concat(this.masterAdmins);
            tmc.admins = this.admins;
        } catch (e: any) {
            tmc.cli('$f00Error while loading admins');
            tmc.cli(e.message);
            process.exit();
        }

        if (existsSync(import.meta.dirname + this.settingsFile)) {
            try {
                this.settings = Object.assign({}, this._defaultSettings, JSON.parse(readFileSync(import.meta.dirname + this.settingsFile, 'utf-8')) || {});
            } catch (e: any) {
                tmc.cli('$f00Error loading settings');
                tmc.cli(e.message);
                process.exit();
            }
        }
        if (existsSync(import.meta.dirname + this.colorsFile)) {
            try {
                const colors = JSON.parse(readFileSync(import.meta.dirname + this.colorsFile, 'utf-8')) || {};
                this.colors = Object.assign({}, this._defaultColors, colors);
            } catch (e: any) {
                tmc.cli('$f00Error loading colors');
                tmc.cli(e.message);
                process.exit();
            }
        }
        tmc.cli('¤info¤Settings loaded!');
    }

    save() {
        try {
            const outSettings: any = {};
            for (const key in this.settings) {
                if (this.settings[key] !== this._defaultSettings[key]) {
                    outSettings[key] = this.settings[key];
                }
            }
            writeFileSync(import.meta.dirname + this.settingsFile, JSON.stringify(outSettings));
            const colors: any = {};
            for (const color in this.colors) {
                if (this.colors[color] !== this._defaultColors[color]) {
                    colors[color] = this.colors[color];
                }
            }
            writeFileSync(import.meta.dirname + this.colorsFile, JSON.stringify(colors));
            writeFileSync(import.meta.dirname + this.adminsFile, JSON.stringify(this.admins.filter((a) => !this.masterAdmins.includes(a))));
        } catch (e: any) {
            tmc.cli('¤error¤Error while saving settings!');
            tmc.cli(e.message);
        }
    }

    init(file: string, data: any) {
        if (!existsSync(import.meta.dirname + file)) {
            try {
                writeFileSync(import.meta.dirname + file, JSON.stringify(data));
            } catch (e: any) {
                tmc.cli('$f00Error while creating ' + file);
                tmc.cli(e.message);
                process.exit(1);
            }
        }
    }

    /**
     * Register a setting, with a default value, a callback function and a description
     * Callback function is called when the setting is changed, use null if no callback is needed
     * @param key
     * @param value
     * @param callback
     * @param description
     */
    register(key: string, value: any, callback: null | ((value: any, oldValue: any) => Promise<void>), description: string = '') {
        this._defaultSettings[key] = value;
        this.callbacks[key] = callback;
        this.descriptions[key] = description;
        if (!Object.keys(this.settings).includes(key)) this.settings[key] = value;
    }

    get(key: string) {
        return this.settings[key];
    }

    getDefault(key: string) {
        return this._defaultSettings[key];
    }

    /**
     * Set a setting, and call the callback if it exists
     * if the value is the same as the current value, the callback will not be called
     */
    async set(key: string, value: any) {
        const oldValue = clone(this.settings[key]);
        const newValue = clone(value);

        if (!this.settings.hasOwnProperty(key)) {
            throw new Error(`Key ${key} does not exist in settings`);
        }

        if (this.settings[key] === newValue) return;

        this.settings[key] = newValue;
        this.save();

        if (this.callbacks[key]) {
            await this.callbacks[key](newValue, oldValue);
        }
        tmc.server.emit('TMC.SettingsChanged', {});
    }

    /**
     * Register a color, with a default value, a callback function and a description
     * Callback function is called when the setting is changed, use null if no callback is needed
     * @param key
     * @param value
     * @param callback
     * @param description
     */
    registerColor(key: string, value: any, callback: null | ((value: any, oldValue: any) => Promise<void>), description: string = '') {
        this._defaultColors[key] = value;
        this.callbacks['color.' + key] = callback;
        this.colorDescriptions[key] = description;
        if (!Object.keys(this.colors).includes(key)) this.colors[key] = value;
    }

    getColor(key: string) {
        return this.colors[key] || 'fff';
    }

    getSettings(): { settings: { [key: string]: any }; defaults: { [key: string]: any }; descriptions: { [key: string]: string } } {
        return {
            settings: this.settings,
            defaults: this._defaultSettings,
            descriptions: this.descriptions
        };
    }

    getColors(): { colors: { [key: string]: string }; defaults: { [key: string]: string }; descriptions: { [key: string]: string } } {
        return {
            colors: this.colors,
            defaults: this._defaultColors,
            descriptions: this.colorDescriptions
        };
    }

    getDefaultColor(key: string) {
        return this._defaultColors[key];
    }

    async setColor(key: string, value: any) {
        const oldValue = clone(this.colors[key]);
        this.colors[key] = value;
        this.save();

        const idx = 'color.' + key;

        if (this.callbacks[idx]) {
            await this.callbacks[idx](value, oldValue);
        }
        tmc.server.emit('TMC.ColorsChanged', {});
    }

    addAdmin(login: string) {
        if (this.admins.includes(login)) {
            tmc.cli('¤error¤Trying to add admin that already exists!');
            return;
        }
        this.admins.push(login);
        tmc.admins = this.admins;
        this.save();
        tmc.server.emit('TMC.AdminsChanged', {});
    }

    removeAdmin(login: string) {
        if (this.masterAdmins.includes(login)) {
            tmc.cli('¤error¤Cannot remove master admin!');
            return;
        }

        let index = this.admins.indexOf(login);
        while (index > -1) {
            this.admins.splice(index, 1);
            index = this.admins.indexOf(login);
        }
        tmc.admins = this.admins;
        this.save();
        tmc.server.emit('TMC.AdminsChanged', {});
    }

    async reset(key: string) {
        const oldValue = clone(this.settings[key]);
        const newValue = clone(this._defaultSettings[key]);

        delete this.settings[key];
        this.save();
        this.settings[key] = newValue;

        if (this.callbacks[key]) {
            await this.callbacks[key](newValue, oldValue);
        }
        tmc.server.emit('TMC.SettingsChanged', {});
    }

    async resetColor(key: string) {
        const oldValue = clone(this.colors[key]);
        const newValue = clone(this._defaultColors[key]);
        delete this.colors[key];

        this.save();
        this.colors[key] = newValue;
        if (this.callbacks[key]) {
            await this.callbacks[key](newValue, oldValue);
        }
        tmc.server.emit('TMC.ColorsChanged', {});
    }
}
