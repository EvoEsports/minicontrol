import type Manialink from './ui/manialink';
import Window from './ui/window';
import { chunkArray } from './utils';

export interface uiModule {
    id: string;
    position: number[];
    scale: number;
    visible: boolean;
}

interface CustomUI {
    notice: boolean;
    challenge_info: boolean;
    net_infos: boolean;
    chat: boolean;
    checkpoint_list: boolean;
    round_scores: boolean;
    scoretable: boolean;
    multilap_infos: boolean;
    speed_and_distance: boolean;
    player_ranking: boolean;
    global: boolean;
}

export default class UiManager {
    private actions: any = {};
    private publicManialinks: { [key: string]: Manialink } = {};
    private playerManialinks: { [key: string]: Manialink } = {};
    private manialinkUUID: number = 2;
    private hiddenManialinks: string[] = [];
    private uiProperties: uiModule[] = [];
    private scriptCalls: string[] = [];
    tmnfCustomUi: CustomUI = {
        notice: false,
        challenge_info: false,
        net_infos: true,
        chat: true,
        checkpoint_list: false,
        round_scores: true,
        scoretable: true,
        multilap_infos: true,
        speed_and_distance: false,
        player_ranking: false,
        global: true
    };

    /**
     * @ignore
     */
    async init() {
        tmc.server.addListener('Trackmania.PlayerManialinkPageAnswer', this.onManialinkAnswer, this);
        tmc.server.addListener('Trackmania.PlayerConnect', this.onPlayerConnect, this);
        tmc.server.addListener('Trackmania.PlayerDisconnect', this.onPlayerDisconnect, this);
        if (tmc.game.Name == 'Trackmania') {
            tmc.server.addListener('Common.UIModules.Properties', this.onCallbackArray, this);
            await this.getUiProperties();
        }

        if ((tmc.game.Name == 'TmForever')) {
            tmc.settings.register('tmf.hud.round_scores', true, this.uiSettingsChange.bind(this), 'TmForever HUD: Show round scores');
            tmc.settings.register('tmf.hud.checkpoint_list', false, this.uiSettingsChange.bind(this), 'TmForever HUD: Show checkpoint list');
            tmc.settings.register('tmf.hud.net_infos', true, this.uiSettingsChange.bind(this), 'TmForever HUD: Show net infos');
            tmc.settings.register('tmf.hud.challenge_info', false, this.uiSettingsChange.bind(this), 'TmForever HUD: Show challenge info');
            tmc.settings.register('tmf.hud.notice', false, this.uiSettingsChange.bind(this), 'TmForever HUD: Show notice');
        }

    }

    /**
     *  @ignore
     */
    async afterInit() {
        if (tmc.game.Name == 'TmForever') {
            await this.syncTmfHudSettings();
        }
        if (tmc.game.Name == 'Trackmania') {
            this.setUiProperty('Race_RespawnHelper', 'visible', false);
            this.setUiProperty('Race_DisplayMessage', 'visible', false);
            this.setUiProperty('Race_BestRaceViewer', 'visible', false);
            this.setUiProperty('Race_DisplayMessage', 'visible', false);
            this.setUiProperty('Race_Record', 'scale', 0.8);
            this.setUiProperty('Race_Countdown', 'position', [155, -50]);
            // checkpoint counter is integrated with laps counter for some reason
            this.setUiProperty('Race_LapsCounter', 'position', [155.7, -77]);
            this.setUiProperty('Race_LapsCounter', 'scale', 0.7);
            await this.sendUiProperties();
        }
        tmc.server.send('SendDisplayManialinkPage', this.convert(this.getGlobalManialink()), 0, false);
    }

    async getUiProperties() {
        const uuid = this.uuid();
        this.scriptCalls.push(uuid);
        tmc.server.callScript('Common.UIModules.GetProperties', uuid);
    }

    async setUiProperty(id: string, property: string, value: any) {
        let uiModule: { [key: string]: any } = this.uiProperties.find((uiModule) => uiModule.id == id) ?? {};
        if (uiModule.id == id) {
            uiModule[property] = value;
            uiModule[property + '_update'] = true;
        } else {
            tmc.cli('¤error¤ui module not found: ¤white¤' + id);
        }
    }

    async sendUiProperties() {
        tmc.server.send('TriggerModeScriptEventArray', 'Common.UIModules.SetProperties', [`{"uimodules": ${JSON.stringify(this.uiProperties)}}`]);
    }

    private async onCallbackArray(data: any) {
        if (data && this.scriptCalls.includes(data.responseid)) {
            this.scriptCalls.splice(this.scriptCalls.indexOf(data.responseid), 1);
            if (data.uimodules) {
                this.uiProperties = data.uimodules as uiModule[];
                let reset: string[] = [];
                for (let uiModule of this.uiProperties) {
                    reset.push(uiModule.id);
                }
                const json = {
                    uimodules: reset
                };
                tmc.server.callScript('Common.UIModules.ResetProperties', `${JSON.stringify(json)}`);
            }
        }
    }

    /**
     * @ignore
     * @param line
     * @returns
     */
    private convertLine(line: string): string {
        const matches = line.matchAll(/(pos|size)="([-.\d]+)\s+([-.\d]+)"/g);
        let out = line;
        for (let match of matches) {
            const x = (Number.parseFloat(match[2]) / 160) * 64;
            const y = (Number.parseFloat(match[3]) / 90) * 48;
            let z = 0;
            const zindex = line.match(/z-index="([\-\d]+)"/) || ['0', '0'];
            z = Number.parseInt(zindex[1]) ?? 1;
            if (match[1] == 'pos') {
                out = out.replaceAll(match[0], `${match[1]}n="${x} ${y} ${z}"`).replace(/z-index="[-\d]+"/, '');
            } else if (match[1] == 'size') {
                out = out.replaceAll(match[0], `${match[1]}n="${x} ${y}"`);
            }
        }
        return out;
    }

    /**
     * @ignore
     * @param text
     * @returns
     */
    convert(text: string): string {
        if (tmc.game.Name !== 'TmForever') return text;

        let lines = text.split('\n');
        let out = '';
        for (let i = 0; i < lines.length; i++) {
            out += this.convertLine(lines[i]);
        }
        return out;
    }

    /**
     * generate new uuid for manialink
     * @returns
     */
    uuid(): string {
        this.manialinkUUID += 1;
        const prefix = tmc.game.Name == 'TmForever' ? '' : 'tmc';
        tmc.debug('¤info¤new manialink uuid: ¤white¤' + prefix + this.manialinkUUID.toString());
        return prefix + this.manialinkUUID.toString();
    }

    /**
     * hash string
     * @ignore
     * @param str
     * @returns
     */
    hash(str: string): number {
        let hash = 0;
        if (str.length == 0) return hash;
        for (let i = 0; i < str.length; i++) {
            let char = str.charCodeAt(i);
            hash = (hash << 4) - hash + char;
            hash |= 0;
        }
        return hash;
    }
    /**
     * Add manialink action
     * @param callback
     * @param data
     */
    addAction(callback: CallableFunction, data: any): string {
        const getHash = () => {
            const salt = Math.random().toString(36).substring(2, 12);
            return this.hash(salt);
        };
        let iHash = getHash();
        const prefix = tmc.game.Name == 'TmForever' ? '' : 'tmc';
        if (this.actions[prefix + iHash.toString()]) {
            while (this.actions[prefix + iHash.toString()]) {
                tmc.debug('¤error¤action already exists: ¤white¤' + iHash + '¤white¤ increase and trying again...');
                iHash += 1;
            }
        }
        const hash = prefix + iHash.toString();
        this.actions[hash] = { callback: callback, data: data };
        // tmc.debug('¤info¤Added action: ¤white¤' + hash + ' ¤info¤total actions: ¤white¤' + Object.keys(this.actions).length.toString());
        return hash;
    }

    /**
     * remove manialink action
     * @param actionId
     */
    removeAction(actionId: string) {
        if (this.actions[actionId]) {
            delete this.actions[actionId];
            // tmc.debug('¤info¤deleted action: ¤white¤' + actionId + ' ¤info¤total actions: ¤white¤' + Object.keys(this.actions).length.toString());
        } else {
            // tmc.debug("¤error¤action not found: " + actionId);
        }
    }

    /** @ignore */
    private async onManialinkAnswer(data: any) {
        const login = data[1];
        const answer = data[2].toString();
        const entries = data[3];
        if (answer == '-2') {
            if (!this.hiddenManialinks.includes(login)) {
                this.hiddenManialinks.push(login);
                let hide = '<manialinks>';
                for (let id in this.publicManialinks) {
                    hide += `<manialink id="${id}"></manialink>`;
                }
                for (let id of Object.keys(this.playerManialinks[login])) {
                    hide += `<manialink id="${id}"></manialink>`;
                }
                hide += '</manialinks>';
                tmc.server.send('SendDisplayManialinkPageToLogin', login, hide, 0, false);
            } else {
                this.hiddenManialinks.splice(this.hiddenManialinks.indexOf(login), 1);
                this.onPlayerConnect([login]);
            }
            return;
        }
        if (this.actions[answer]) {
            this.actions[answer].callback(login, this.actions[answer].data, entries);
        }
    }

    /** @ignore */
    private async onPlayerConnect(data: any) {
        const login = data[0];

        let multi = [['SendDisplayManialinkPage', this.convert(this.getGlobalManialink()), 0, false]];
        for (let manialink of Object.values(this.publicManialinks)) {
            const render = await (manialink as Manialink).render();
            const xml = `<?xml version="1.0" encoding="UTF-8"?><manialinks>${this.convert(render)}</manialinks>`;
            multi.push(['SendDisplayManialinkPageToLogin', login, xml, 0, false]);
        }
        if (this.playerManialinks[login] == undefined) this.playerManialinks[login] = {} as Manialink;
        for (let manialink of Object.values(this.playerManialinks[login])) {
            const render = await (manialink as Manialink).render();
            const xml = `<?xml version="1.0" encoding="UTF-8"?><manialinks>${this.convert(render)}</manialinks>`;
            multi.push(['SendDisplayManialinkPageToLogin', login, xml, 0, false]);
        }
        tmc.server.multicall(multi);

        if (tmc.game.Name == 'TmForever') {
            this.sendTmnfCustomUI();
        }
    }

    /** @ignore */
    private async onPlayerDisconnect(data: any) {
        const login = data[0];
        if (this.hiddenManialinks.includes(login)) {
            this.hiddenManialinks.splice(this.hiddenManialinks.indexOf(login), 1);
        }
        for (const id in this.playerManialinks[login]) {
            this.destroyManialink(this.playerManialinks[login.toString()][id.toString()], false);
        }
    }

    /**
     * Display manialink
     * @param manialink
     */
    async displayManialink(manialink: Manialink) {
        if (!manialink) return;
        if (manialink.recipient == undefined) {
            if (this.publicManialinks[manialink.id] && !(this.publicManialinks[manialink.id] === manialink)) {
                tmc.debug('¤error¤destroying old manialink: ¤white¤' + manialink.id);
                this.publicManialinks[manialink.id].destroy();
            }
            this.publicManialinks[manialink.id.toString()] = manialink;
        } else {
            if (this.playerManialinks[manialink.recipient] == undefined) this.playerManialinks[manialink.recipient] = {} as Manialink;

            if (manialink instanceof Window) {
                for (let id in this.playerManialinks[manialink.recipient]) {
                    if (this.playerManialinks[manialink.recipient][id] instanceof Window) {
                        await (this.playerManialinks[manialink.recipient][id] as Window).destroy();
                        delete this.playerManialinks[manialink.recipient][id];
                    }
                }
            }

            if (manialink && this.playerManialinks[manialink.recipient][manialink.id] && !(this.playerManialinks[manialink.recipient][manialink.id] === manialink)) {
                tmc.debug('¤error¤destroying old manialink: ¤white¤' + manialink.id);
                this.playerManialinks[manialink.recipient][manialink.id].destroy();
            }

            this.playerManialinks[manialink.recipient][manialink.id.toString()] = manialink;
        }
        const render = await manialink.render();
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <manialinks>${this.convert(render)}</manialinks>`;
        if (manialink.recipient !== undefined) {
            if (!this.hiddenManialinks.includes(manialink.recipient)) {
                tmc.server.send('SendDisplayManialinkPageToLogin', manialink.recipient, xml, 0, false);
            }
        } else {
            if (this.hiddenManialinks.length > 0) {
                const logins = tmc.players.getAll().map((player) => player.login);
                const recipients = logins.filter((login) => !this.hiddenManialinks.includes(login));
                tmc.server.send('SendDisplayManialinkPageToLogin', recipients.join(','), xml, manialink.displayDuration, false);
            } else {
                tmc.server.send('SendDisplayManialinkPage', xml, manialink.displayDuration, false);
            }
        }
    }

    /**
     * Display array of manialinks
     * @param manialinks
     */
    async displayManialinks(manialinks: Manialink[]) {
        let callArray: any = [];
        for (const manialink of manialinks) {
            if (!manialink) continue;
            if (manialink.recipient == undefined) {
                if (this.publicManialinks[manialink.id] && !(this.publicManialinks[manialink.id] === manialink)) {
                    tmc.debug('¤error¤destroying old manialink: ¤white¤' + manialink.id);
                    this.publicManialinks[manialink.id].destroy();
                }
                this.publicManialinks[manialink.id] = manialink;
            } else {
                if (this.playerManialinks[manialink.recipient] == undefined) this.playerManialinks[manialink.recipient] = {} as Manialink;
                if (manialink instanceof Window) {
                    for (let id in this.playerManialinks[manialink.recipient]) {
                        if (this.playerManialinks[manialink.recipient][id] instanceof Window) {
                            await (this.playerManialinks[manialink.recipient][id] as Window).destroy();
                            delete this.playerManialinks[manialink.recipient][id];
                        }
                    }
                }
                if (this.playerManialinks[manialink.recipient][manialink.id] && !(this.playerManialinks[manialink.recipient][manialink.id] === manialink)) {
                    tmc.debug('¤error¤destroying old manialink: ¤white¤' + manialink.id);
                    this.playerManialinks[manialink.recipient][manialink.id].destroy();
                }
                this.playerManialinks[manialink.recipient][manialink.id.toString()] = manialink;
            }
            const render = await manialink.render();
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
            <manialinks>${this.convert(render)}</manialinks>`;
            if (manialink.recipient !== undefined) {
                if (!this.hiddenManialinks.includes(manialink.recipient)) {
                    callArray.push(['SendDisplayManialinkPageToLogin', manialink.recipient, xml, 0, false]);
                }
            } else {
                if (this.hiddenManialinks.length > 0) {
                    const logins = tmc.players.getAll().map((player) => player.login);
                    const recipients = logins.filter((login) => !this.hiddenManialinks.includes(login));
                    callArray.push(['SendDisplayManialinkPageToLogin', recipients.join(','), xml, manialink.displayDuration, false]);
                } else {
                    callArray.push(['SendDisplayManialinkPage', xml, manialink.displayDuration, false]);
                }
            }
        }
        for (const calls of chunkArray(callArray, 50)) {
            await tmc.server.multicall(calls);
        }
    }

    /**
     * Refresh manialink
     * @param manialink
     */
    async refreshManialink(manialink: Manialink) {
        const render = await manialink.render();
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <manialinks>${this.convert(render)}</manialinks>`;
        if (manialink.recipient !== undefined) {
            if (!this.hiddenManialinks.includes(manialink.recipient)) {
                tmc.server.send('SendDisplayManialinkPageToLogin', manialink.recipient, xml, manialink.displayDuration, false);
            }
        } else {
            if (this.hiddenManialinks.length > 0) {
                const logins = tmc.players.getAll().map((player) => player.login);
                const recipients = logins.filter((login) => !this.hiddenManialinks.includes(login));
                tmc.server.send('SendDisplayManialinkPageToLogin', recipients.join(','), xml, manialink.displayDuration, false);
            } else {
                tmc.server.send('SendDisplayManialinkPage', xml, manialink.displayDuration, false);
            }
        }
    }

    /**
     * Hide manialink
     * @param manialink
     */
    async hideManialink(manialink: Manialink) {
        try {
            tmc.debug('¤info¤hiding manialink: ¤white¤' + manialink.id);
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
            <manialinks><manialink id="${manialink.id}"></manialink></manialinks>`;
            if (manialink.recipient !== undefined) {
                tmc.server.send('SendDisplayManialinkPageToLogin', manialink.recipient, xml, 0, false);
                return;
            }
            tmc.server.send('SendDisplayManialinkPage', xml, 0, false);
        } catch (e) {
            tmc.debug(e);
        }
    }

    async destroyManialink(manialink: Manialink, hide: boolean = true) {
        tmc.debug('¤info¤destroying manialink: ¤white¤' + manialink.id);
        if (hide) {
            this.hideManialink(manialink);
        }
        for (let id in manialink.actions) {
            this.removeAction(manialink.actions[id]);
        }
        manialink.data = [];
        if (manialink.recipient !== undefined) {
            for (let login in this.playerManialinks) {
                if (this.playerManialinks[login][manialink.id]) {
                    delete this.playerManialinks[login][manialink.id];
                }
            }
        } else {
            for (let id in this.publicManialinks) {
                if (id == manialink.id) {
                    delete this.publicManialinks[id];
                }
            }
        }
    }
    /** set clipboard content for user */
    setClipboard(login: string, text: string) {
        if (login == undefined) return;
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <manialinks>
        <manialink id="${this.uuid()}" version="3">
        <script><!--
        main() {
            System.ClipboardSet("${text.replace(/"/g, '\\"').replaceAll('--', '—-')}");
        }
        --></script>
        </manialink>
        </manialinks>`;
        tmc.server.send('SendDisplayManialinkPageToLogin', login, xml, 1000, false);
    }

    setCustomUI(key: string, value: boolean) {
        if (this.tmnfCustomUi[key]) {
            this.tmnfCustomUi[key] = value;
            this.sendTmnfCustomUI();
        } else {
            tmc.cli('¤error¤invalid key: ¤white¤' + key + '¤error¤ for custom ui');
        }
    }
    getCustomUI() {
        return this.tmnfCustomUi;
    }

    async uiSettingsChange(value: string, oldValue: boolean, _key: string) {
        let key = _key.replace('tmf.hud.', '');
        if (Object.keys(this.tmnfCustomUi).includes(key)) {
            this.tmnfCustomUi[key] = value;
            this.sendTmnfCustomUI();
        }
    }

    async syncTmfHudSettings() {
        const keys = Object.keys(this.tmnfCustomUi);
        for (let key of keys) {
            const value = tmc.settings.get('tmf.hud.' + key);
            if (value === undefined) continue;
            this.tmnfCustomUi[key] = value;
        }
        this.sendTmnfCustomUI();
    }

    sendTmnfCustomUI() {
        if (tmc.game.Name == 'TmForever') {
            let xml = `<?xml version="1.0" encoding="UTF-8"?>
        <manialinks><custom_ui>`;
            for (let key in this.tmnfCustomUi) {
                xml += `<${key} visible="${this.tmnfCustomUi[key] ? 'true' : 'false'}" />`;
            }
            xml += `</custom_ui></manialinks>`;
            tmc.server.send('SendDisplayManialinkPage', xml, 0, false);
        }
    }

    getGlobalManialink() {
        return `
        <?xml version="1.0" encoding="UTF-8"?>
        <manialinks>
        <manialink id="1" version="3">
            <frame pos="-152.5 -36" z-index="1">
                <label pos="0 0" size="0 0" valign="center2" halign="center" textsize="0.5" textcolor="fff" text=" " focusareacolor1="0000" focusareacolor2="0000" actionkey="3" action="-2"/>
            </frame>
        </manialink>
        </manialinks>`;
    }
}
