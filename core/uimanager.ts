import Twig from 'twig';
import fs from 'fs';
import Server from "./server";
import { colors } from './utils';

export default class UiManager {
    private server: Server;
    private counter = 0;
    private actions: any = {};
    private publicManialinks: any = {};
    private playerManialinks: any = {};
    private manialinkUUID: number = 0;

    constructor(server: Server) {
        this.server = server;
        server.on("Trackmania.PlayerManialinkPageAnswer", (data) => this.onManialinkAnswer(data));
        server.on("Trackmania.PlayerConnect", (data) => this.onPlayerConnect(data));
        server.on("Trackmania.PlayerDisconnect", (data) => this.onPlayerDisconnect(data));
    }

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

    /**
     * Add manialink action, increase manialink counter by one
     * @param callback 
     * @param data
     * @returns {Number}
     */
    addAction(callback: CallableFunction, data: any): number {
        this.counter = Object.keys(this.actions).length;
        this.actions[this.counter.toString()] = { callback: callback, data: data };
        tmc.debug("¤info¤Added action: ¤white¤" + this.counter.toString() + " ¤info¤total actions: ¤white¤" + Object.keys(this.actions).length.toString());
        return this.counter;
    }

    /**
     * remove manialink action
     * @param actionId 
     */
    removeAction(actionId: string | number) {
        if (typeof actionId === 'number') actionId = actionId.toString();
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
            this.server.send('SendDisplayManialinkPage', this.getTmufCustomUi(), 0, false);
        }
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
        this.server.gbx.multicall(multi);

        if (tmc.game.Name == "TmForever") {
            this.server.send('SendDisplayManialinkPageToLogin', login, this.getTmufCustomUi(), 0, false);
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
                this.server.send('SendDisplayManialinkPageToLogin', typeof login === 'string' ? login : login.join(','), xml, 0, false)
                return;
            }
            if (id) {
                this.publicManialinks[id[1].toString()] = xml;
            } else {
                const message = "¤error¤manialink id not found!, remember to call ¤white¤tmc.ui.uuid()¤error¤ and assign the value for your manialink!";
                tmc.cli(message);
                tmc.chat(message);
            }
            this.server.send("SendDisplayManialinkPage", xml, 0, false);
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
                this.server.send('SendDisplayManialinkPageToLogin', typeof login === 'string' ? login : login.join(','), manialink, 0, false)
                Bun.gc(true);
                return;
            }
            delete this.publicManialinks[id.toString()];
            this.server.send("SendDisplayManialinkPage", manialink, 0, false);
            Bun.gc(true);
        } catch (e) {
            tmc.debug(e);
        }
    }

    /** @ignore */
    private onHidePlayerManialink(id: string, login: string | string[]) {
        let split:string[] = [];
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