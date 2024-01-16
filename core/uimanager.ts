import Twig from 'twig';
import type Manialink from './ui/manialink';
import Window from './ui/window';
import { clone } from './utils';
import { collapseTextChangeRangesAcrossMultipleVersions } from 'typescript';

Twig.cache(false);

export interface uiModule {
    id: string,
    position: number[],
    scale: number,
    visible: boolean,
}


export default class UiManager {
    private actions: any = {};
    private publicManialinks: any = {};
    private playerManialinks: any = {};
    private manialinkUUID: number = 2;
    private hiddenManialinks: string[] = [];
    private uiProperties: uiModule[] = [];
    private scriptCalls: string[] = [];

    /**
    * @ignore
    */
    async init() {
        tmc.server.addListener("Trackmania.PlayerManialinkPageAnswer", this.onManialinkAnswer, this);
        tmc.server.addListener("Trackmania.PlayerConnect", this.onPlayerConnect, this);
        tmc.server.addListener("Trackmania.PlayerDisconnect", this.onPlayerDisconnect, this);
        tmc.server.addListener("Common.UIModules.Properties", this.onCallbackArray, this);
        if (tmc.game.Name == "Trackmania") {
            await this.getUiProperties();
        }
    }

    /**
     *  @ignore
     */
    async afterInit() {
        if (tmc.game.Name == "TmForever") {
            tmc.server.send('SendDisplayManialinkPage', this.getTmufCustomUi(), 0, false);
        }
        tmc.server.call('SendDisplayManialinkPage', this.convert(this.getGlobalManialink()), 0, false);
    }

    async getUiProperties() {
        const uuid = this.uuid();
        this.scriptCalls.push(uuid);
        await tmc.server.callScript('Common.UIModules.GetProperties', uuid);
    }

    async setUiProperty(id: string, property: string, value: any) {
        let uiModule: { [key: string]: any } = this.uiProperties.find((uiModule) => uiModule.id == id) ?? {};
        if (uiModule.id == id) {
            uiModule[property] = value;
            uiModule[property + "_update"] = true;
        } else {
            tmc.debug("¤error¤ui module not found: ¤white¤" + id);
        }
    }
    
    async sendUiProperties() {            
        await tmc.server.call("TriggerModeScriptEventArray", 'Common.UIModules.SetProperties', [`{"uimodules": ${JSON.stringify(this.uiProperties)}}`]);
    }

    private async onCallbackArray(data: any) {
        if (data && this.scriptCalls.includes(data.responseid)) {
            this.scriptCalls.splice(this.scriptCalls.indexOf(data.responseid), 1);
            if (data.uimodules) {
                this.uiProperties = data.uimodules as uiModule[];
                let reset = [];
                for (let uiModule of this.uiProperties) {
                    reset.push(uiModule.id);
                }
                const json = {
                    uimodules: reset
                };
                await tmc.server.callScript('Common.UIModules.ResetProperties', `${JSON.stringify(json)}`);
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
            const zindex = line.match(/z-index="(\d+)"/) || ["0", "0"];
            z = Number.parseInt(zindex[1]) ?? 0;
            out = out.replaceAll(match[0], `${match[1]}n="${x} ${y} ${z}"`).replace(/z-index="\d+"/, "");
        }
        return out;
    }

    /**
     * @ignore
     * @param text 
     * @returns 
     */
    private convert(text: string): string {
        if (tmc.game.Name !== "TmForever") return text;

        let lines = text.split('\n');
        let out = '';
        for (let i = 0; i < lines.length; i++) {
            out += this.convertLine(lines[i]);
        }
        return out;
    }

    /**
     * generate new uuid for manialink
     * @param nb 
     * @returns 
     */
    uuid(): string {
        this.manialinkUUID += 1;
        const prefix = tmc.game.Name == "TmForever" ? "" : "tmc";
        tmc.debug("¤info¤new manialink uuid: ¤white¤" + prefix + this.manialinkUUID.toString());
        return prefix + this.manialinkUUID.toString();
    }

    /**
     * hash string
     * @ignore
     * @param str 
     * @returns 
     */
    hash(str: string): string {
        let hash = 0;
        if (str.length == 0) return hash.toString();
        for (let i = 0; i < str.length; i++) {
            let char = str.charCodeAt(i);
            hash = ((hash << 4) - hash) + char;
            hash |= 0;
        }
        return hash.toString();
    }
    /**
     * Add manialink action
     * @param callback 
     * @param data
     * @returns {str}
     */
    addAction(callback: CallableFunction, data: any): string {
        const getHash = (data: any) => {
            const salt = Math.random().toString(36).substring(2, 12);
            return this.hash(salt) // + JSON.stringify(data));
        };
        let hash = getHash(data);
        if (this.actions[hash.toString()]) {
            tmc.debug("¤error¤action already exists: ¤white¤" + hash + "$fff trying again...");
            hash = getHash(data);
        }
        const prefix = tmc.game.Name == "TmForever" ? "" : "tmc";
        hash = prefix + hash;
        this.actions[hash] = { callback: callback, data: data };
        tmc.debug("¤info¤Added action: ¤white¤" + hash + " ¤info¤total actions: ¤white¤" + Object.keys(this.actions).length.toString());
        return hash;
    }

    /**
     * remove manialink action
     * @param actionId 
     */
    removeAction(actionId: string) {
        if (this.actions[actionId]) {
            delete this.actions[actionId];
            tmc.debug("¤info¤deleted action: ¤white¤" + actionId + " ¤info¤total actions: ¤white¤" + Object.keys(this.actions).length.toString());
        } else {
            //    tmc.debug("¤error¤action not found: " + actionId);
        }
    }


    /** @ignore */
    private async onManialinkAnswer(data: any) {
        const login = data[1];
        const answer = data[2].toString();
        const entries = data[3];
        if (answer == "-2") {
            if (!this.hiddenManialinks.includes(login)) {
                this.hiddenManialinks.push(login);
                let hide = "<manialinks>";
                for (let id in this.publicManialinks) {
                    hide += `<manialink id="${id}"></manialink>`;
                }
                hide += "</manialinks>";
                await tmc.server.call("SendDisplayManialinkPageToLogin", login, hide, 0, false);

            } else {
                this.hiddenManialinks.splice(this.hiddenManialinks.indexOf(login), 1);
                this.onPlayerConnect([login]);
            }
            return;
        }
        if (this.actions[answer]) {
            await this.actions[answer].callback(login, this.actions[answer].data, entries);
        }
    }

    /** @ignore */
    private async onPlayerConnect(data: any) {
        const login = data[0];

        let multi = [
            ['SendDisplayManialinkPage', this.convert(this.getGlobalManialink()), 0, false]
        ];
        for (let manialink of Object.values(this.publicManialinks)) {
            const render = (manialink as Manialink).render();
            const xml = `<manialinks>${this.convert(render)}</manialinks>`;
            multi.push(['SendDisplayManialinkPageToLogin', login, xml, 0, false]);
        }
        tmc.server.gbx.multicall(multi);

        if (tmc.game.Name == "TmForever") {
            tmc.server.send('SendDisplayManialinkPageToLogin', login, this.getTmufCustomUi(), 0, false);
        }
    }

    /** @ignore */
    private async onPlayerDisconnect(data: any) {
        const login = data[0];
        if (this.hiddenManialinks.includes(login)) {
            this.hiddenManialinks.splice(this.hiddenManialinks.indexOf(login), 1);
        }
        for (const id in this.playerManialinks[login]) {
            await this.playerManialinks[login.toString()][id.toString()].destroy();
        }
    }

    /**
     * Display manialink
     * @param manialink 
     */
    async displayManialink(manialink: Manialink) {
        if (manialink.recipient == undefined) {
            if (!this.publicManialinks[manialink.id]) {
                this.publicManialinks[manialink.id] = manialink;
            }
        } else {
            if (this.playerManialinks[manialink.recipient] == undefined) this.playerManialinks[manialink.recipient] = {};
            if (manialink instanceof Window) {
                for (let id in this.playerManialinks[manialink.recipient]) {
                    if (this.playerManialinks[manialink.recipient][id] instanceof Window) {
                        await (this.playerManialinks[manialink.recipient][id] as Window).destroy();
                        delete this.playerManialinks[manialink.recipient][id];
                    }
                }
            }
            this.playerManialinks[manialink.recipient][manialink.id.toString()] = manialink;
        }
        const render = await manialink.render();
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <manialinks>${this.convert(render)}</manialinks>`;
        if (manialink.recipient !== undefined) {
            await tmc.server.send("SendDisplayManialinkPageToLogin", manialink.recipient, xml, 0, false,);
        } else {
            if (this.hiddenManialinks.length > 0) {
                const logins = tmc.players.get().map((player) => player.login);
                const recipients = logins.filter((login) => !this.hiddenManialinks.includes(login));
                await tmc.server.send("SendDisplayManialinkPageToLogin", recipients.join(","), xml, 0, false,);
            } else {
                await tmc.server.send("SendDisplayManialinkPage", xml, 0, false);
            }
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
            tmc.server.send("SendDisplayManialinkPageToLogin", manialink.recipient, xml, 0, false,);
        } else {
            if (this.hiddenManialinks.length > 0) {
                const logins = tmc.players.get().map((player) => player.login);
                const recipients = logins.filter((login) => !this.hiddenManialinks.includes(login));
                await tmc.server.send("SendDisplayManialinkPageToLogin", recipients.join(","), xml, 0, false);
            } else {
                await tmc.server.send("SendDisplayManialinkPage", xml, 0, false);
            }
        }
    }

    /**
     * Hide manialink
     * @param manialink 
     */
    async hideManialink(manialink: Manialink) {
        try {
            tmc.debug("¤info¤hiding manialink: $fff" + manialink.id);
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
            <manialinks><manialink id="${manialink.id}"></manialink></manialinks>`;
            if (manialink.recipient !== undefined) {
                await tmc.server.call('SendDisplayManialinkPageToLogin', manialink.recipient, xml, 0, false);
                return;
            }
            await tmc.server.call("SendDisplayManialinkPage", xml, 0, false);
        } catch (e) {
            tmc.debug(e);
        }
    }

    async destroyManialink(manialink: Manialink) {
        tmc.debug("¤info¤destroying manialink: $fff" + manialink.id);
        await this.hideManialink(manialink);
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
        Bun.gc(true);
    }

    /**      
     * @ignore
     * @returns {string} Returns the default ui for tmuf
     */
    getTmufCustomUi() {
        return `
        <manialinks><custom_ui>
            <notice visible="false"/>            
            <challenge_info visible="false"/>
            <net_infos visible="true"/>
            <chat visible="true"/>
            <checkpoint_list visible="true"/>            
            <round_scores visible="true"/>                
            <scoretable visible="true"/>
            <multilap_infos visible="true"/>
            <speed_and_distance visible="false"/>
            <player_ranking visible="false"/>
            <global visible="true"/>
        </custom_ui></manialinks>`.replaceAll("\n", "");
    }

    getGlobalManialink() {
        return `<manialinks>
        <manialink id="1" version="3">
            <frame pos="-152.5 -36" z-index="1">           
                <label pos="0 0" size="15 3" valign="center2" halign="center" textsize="0.5" textcolor="fff" text="Toggle UI - F7" focusareacolor1="0009" focusareacolor2="000a" actionkey="3" action="-2"/>
            </frame>
        </manialink>
        </manialinks>`;
    }
}