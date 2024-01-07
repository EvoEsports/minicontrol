import Twig from 'twig';
import fs from 'fs';
import { colors } from './utils';

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
        for (let id in this.publicManialinks) {
            multi.push(['SendDisplayManialinkPageToLogin', login, this.publicManialinks[id], 0, false]);
        }
        tmc.server.gbx.multicall(multi);

        if (tmc.game.Name == "TmForever") {
            tmc.server.send('SendDisplayManialinkPageToLogin', login, this.getTmufCustomUi(), 0, false);
        }
    }

    /** @ignore */
    private async onPlayerDisconnect(data: any) {
        const login = data[0];
        for (const id in this.playerManialinks[login.toString()]) {
            await this.hide(id, login);
        }
    }

    /**
     * Get manialink template from file and render it
     * @param file 
     * @param options 
     * @returns 
     */
    renderFile(file: string, options: object): string {
        const template = Twig.twig({ data: fs.readFileSync(file).toString('utf-8') });

        return template.render(Object.assign(options, { colors: colors }));
    }

    /**
     * render manialink template
     * @param xml 
     * @param options 
     * @returns 
     */
    render(xml: string, options: object): string {
        const template = Twig.twig({ data: xml });
        return template.render(Object.assign(options, { colors: colors }));
    }


    /**
     * display a manialink
     * @param manialink string xml
     * @param login 
     * @returns 
     */
    async display(manialink: string, login: string | string[] | undefined = undefined) {
        const xml = `<manialinks>${this.convert(manialink)}</manialinks>`;
        const id = xml.match(/<manialink id="(\d+)"/);
        try {
            if (login !== undefined) {
                if (id) {
                    if (typeof login == "string") login = login.split(",");
                    for (let l of login) {
                        if (!this.playerManialinks[l.toString()]) this.playerManialinks[l.toString()] = {};
                        this.playerManialinks[l.toString()][id[1].toString()] = xml;
                    }
                }
                tmc.server.send('SendDisplayManialinkPageToLogin', typeof login === 'string' ? login : login.join(','), xml, 0, false)
                return;
            }
            if (id) {                
                this.publicManialinks[id[1].toString()] = xml;
            } else {
                const message = "¤error¤manialink id not found!, remember to call ¤white¤tmc.ui.uuid()¤error¤ and assign the value for your manialink!";
                tmc.cli(message);
                tmc.chat(message);
            }
            tmc.server.send("SendDisplayManialinkPage", xml, 0, false);
        } catch (e) {
            tmc.debug(e);
        }
    }

    /**
     * hide manialink
     * @param id 
     * @param login 
     * @returns 
     */
    async hide(id: string, login: string | string[] | undefined = undefined) {
        try {
            const manialink = `<manialinks><manialink id="${id}"></manialink></manialinks>`;
            if (login !== undefined) {
                this.onHidePlayerManialink(id, login);
                tmc.server.send('SendDisplayManialinkPageToLogin', typeof login === 'string' ? login : login.join(','), manialink, 0, false)
                Bun.gc(true);
                return;
            }
            delete this.publicManialinks[id.toString()];
            tmc.server.send("SendDisplayManialinkPage", manialink, 0, false);
            Bun.gc(true);
        } catch (e) {
            tmc.debug(e);
        }
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
                tmc.debug("¤info¤manialink removed: " + id);
            } else {
                tmc.debug("¤error¤manialink not found: " + id);
            }
        }
    }


    /**      
     * @ignore
     * @returns {string} Returns the default ui for tmuf
     */
    private getTmufCustomUi() {
        return `
        <custom_ui>
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
        </custom_ui>`.replaceAll("\n", "");
    }

}