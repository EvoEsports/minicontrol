import Twig from 'twig';
import { colors } from './utils';
import type Manialink from './ui/manialink';
import Window from './ui/window';

Twig.cache(false);

export default class UiManager {
    private actions: any = {};
    private publicManialinks: any = {};
    private playerManialinks: any = {};
    private manialinkUUID: number = 0;

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
        tmc.debug("¤info¤new manialink uuid: ¤white¤" + this.manialinkUUID.toString());
        return this.manialinkUUID.toString();
    }

    hash(str: string): number {
        let hash = 0;
        if (str.length == 0) return hash;
        for (let i = 0; i < str.length; i++) {
            let char = str.charCodeAt(i);
            hash = ((hash << 4) - hash) + char;
            hash |= 0;
        }
        return hash;
    }
    /**
     * Add manialink action, increase manialink counter by one
     * @param callback 
     * @param data
     * @returns {str}
     */
    addAction(callback: CallableFunction, data: any): string {
        const getHash = (data: any) => {
            const salt = Math.random().toString(36).substring(2, 12);
            return this.hash(salt + JSON.stringify(data));
        };
        let hash = getHash(data);
        if (this.actions[hash.toString()]) {
            tmc.debug("¤error¤action already exists: ¤white¤" + hash.toString() + "$fff trying again...");
            hash = getHash(data);
        }
        this.actions[hash.toString()] = { callback: callback, data: data };
        tmc.debug("¤info¤Added action: ¤white¤" + hash.toString() + " ¤info¤total actions: ¤white¤" + Object.keys(this.actions).length.toString());
        return hash.toString();
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

    /**
    * @ignore
    */
    async init() {
        if (tmc.game.Name == "TmForever") {
            tmc.server.send('SendDisplayManialinkPage', this.getTmufCustomUi(), 0, false);
        }
        tmc.server.on("Trackmania.PlayerManialinkPageAnswer", (data) => this.onManialinkAnswer(data));
        tmc.server.on("Trackmania.PlayerConnect", (data) => this.onPlayerConnect(data));
        tmc.server.on("Trackmania.PlayerDisconnect", (data) => this.onPlayerDisconnect(data));


    }
    /** @ignore */
    private async onManialinkAnswer(data: any) {
        const login = data[1];
        const answer = data[2].toString();
        const entries = data[3];
        if (this.actions[answer]) {
            await this.actions[answer].callback(login, this.actions[answer].data, entries);
        }
    }
    /** @ignore */
    private async onPlayerConnect(data: any) {
        const login = data[0];

        let multi = [];
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
        for (const manialink of Object.values(this.playerManialinks[login.toString()])) {
            await (manialink as Manialink).destroy();
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
                    await (this.playerManialinks[manialink.recipient][id] as Window).destroy();
                    delete this.playerManialinks[manialink.recipient][id];
                }
            }
            this.playerManialinks[manialink.recipient][manialink.id.toString()] = manialink;
        }
        const render = await manialink.render();
        const xml = `<manialinks>${this.convert(render)}</manialinks>`;
        if (manialink.recipient !== undefined) {
            await tmc.server.call("SendDisplayManialinkPageToLogin", manialink.recipient, xml, 0, false,);
        } else {
            await tmc.server.call("SendDisplayManialinkPage", xml, 0, false);
        }
    }

    /**
     * Refresh manialink
     * @param manialink 
     */
    async refreshManialink(manialink: Manialink) {
        const render = await manialink.render();
        const xml = `<manialinks>${this.convert(render)}</manialinks>`;
        if (manialink.recipient !== undefined) {
            tmc.server.send("SendDisplayManialinkPageToLogin", manialink.recipient, xml, 0, false,);
        } else {
            tmc.server.send("SendDisplayManialinkPage", xml, 0, false);
        }
    }

    /**
     * Hide manialink
     * @param manialink 
     */
    async hideManialink(manialink: Manialink) {
        try {
            tmc.debug("¤info¤hiding manialink: $fff" + manialink.id);
            const xml = `<manialinks><manialink id="${manialink.id}"></manialink></manialinks>`;
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
            if (this.playerManialinks[manialink.id]) {
                delete this.publicManialinks[manialink.id];
            }
        } else {
            for (let login in this.playerManialinks) {
                if (this.playerManialinks[login][manialink.id]) {
                    delete this.playerManialinks[login][manialink.id];
                }
            }
        }
        Bun.gc(true);
    }

    /** @ignore */
    private onHidePlayerManialink(id: string, login: string | string[]) {
        let split: string[] = [];
        if (typeof login === 'string') split = login.split(',');
        for (let l of split) {
            if (this.playerManialinks[l.toString()][id.toString()]) {
                const xml = this.playerManialinks[l.toString()][id.toString()];
                const matches = xml.matchAll(/action\s*=\s*"(.*?)"/g);
                for (let match of matches) {
                    this.removeAction(match[1]);
                }
                delete this.playerManialinks[l.toString()][id.toString()];
                tmc.debug("¤info¤manialink removed: $fff" + id);
            } else {
                tmc.debug("¤error¤manialink not found: $fff" + id);
            }
        }
    }


    /**      
     * @ignore
     * @returns {string} Returns the default ui for tmuf
     */
    private getTmufCustomUi() {
        return `
        <manialinks><manialink id="-1"></manialink><custom_ui>
            <notice visible="false"/>            
            <challenge_info visible="false"/>
            <net_infos visible="true"/>
            <chat visible="true"/>
            <checkpoint_list visible="false"/>            
            <round_scores visible="true"/>                
            <scoretable visible="true"/>
            <multilap_infos visible="true"/>
            <speed_and_distance visible="false"/>
            <player_ranking visible="false"/>
            <global visible="true"/>
        </custom_ui></manialinks>`.replaceAll("\n", "");
    }

}