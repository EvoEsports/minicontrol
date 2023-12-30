import Twig from 'twig';
import fs from 'fs';
import Server from "./server";
import { colors } from './utils';

export default class UiManager {
    private server: Server;
    private counter = 0;
    private actions: any = {};
    private publicManialinks: any = {};

    constructor(server: Server) {
        this.server = server;
        server.on("Trackmania.PlayerManialinkPageAnswer", (data) => this.onManialinkAnswer(data));
        server.on("Trackmania.PlayerConnect", (data) => this.onPlayerConnect(data));
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
    uuid(nb = 36) {
        const uuid = [], rnd = Math.random;
        let r;
        for (let i = 0; i < nb; i++) {
            uuid[i] = 0 | Math.floor(Math.random() * 9);
        }
        return uuid.join('');
    }

    /**
     * Add manialink action, increase manialink counter by one
     * @param callback 
     * @param data
     * @returns {Number}
     */
    addAction(callback: CallableFunction, data: any): number {
        this.counter += 1;
        this.actions[this.counter.toString()] = { callback: callback, data: data };
        return this.counter;
    }

    /**
     * remove manialink action
     * @param actionId 
     */
    removeAction(actionId: number) {
        if (this.actions[actionId.toString()]) {
            delete this.actions[actionId.toString()];
        }
    }

    async init() {
        if (tmc.game.Name == "TmForever") {
            this.server.send('SendDisplayManialinkPage', this.getTmufCustomUi(), 0, false);
        }
    }

    private async onManialinkAnswer(data: any) {
        const login = data[1];
        const answer = data[2].toString();
        if (this.actions[answer]) {
            await this.actions[answer].callback(login, this.actions[answer].data);
        }
    }

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
     * show manialink
     * @param manialink 
     * @param login 
     * @returns 
     */
    async display(manialink: string, login: string | string[] | undefined = undefined) {
        const xml = `<manialinks>${this.convert(manialink)}</manialinks>`;
        try {
            if (login !== undefined) {
                this.server.send('SendDisplayManialinkPageToLogin', typeof login === 'string' ? login : login.join(','), xml, 0, false)
                return;
            }
            const id = xml.match(/<manialink id="(\d+)"/);
            if (id) {
                this.publicManialinks[id[1].toString()] = xml;
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
                this.server.send('SendDisplayManialinkPageToLogin', typeof login === 'string' ? login : login.join(','), manialink, 0, false)
                return;
            }
            delete this.publicManialinks[id.toString()];
            this.server.send("SendDisplayManialinkPage", manialink, 0, false);
        } catch (e) {
            tmc.debug(e);
        }
    }

    /**      
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