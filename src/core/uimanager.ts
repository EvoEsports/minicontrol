import Twig from 'twig';
import fs from 'fs';
import Server from "./server";

export default class UiManager {
    server: Server;
    counter = 0;
    private actions: any = {};
    transform: any;
    publicManialinks: any = {};

    constructor(server: Server) {
        this.server = server;
        server.on("Trackmania.PlayerManialinkPageAnswer", (data) => this.onManialinkAnswer(data));       
        server.on("Trackmania.PlayerConnect", (data) => this.onPlayerConnect(data));
    }

    convertLine(line: string): string {
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

    convert(text: string): string {
        if (tmc.game.Name !== "TmForever") return text;

        let lines = text.split('\n');
        let out = '';
        for (let i = 0; i < lines.length; i++) {
            out += this.convertLine(lines[i]);
        }
        return out;
    }

    uuid(nb = 36) {
        const uuid = [], rnd = Math.random;
        let r;
        for (let i = 0; i < nb; i++) {
            uuid[i] = 0 | Math.floor(Math.random() * 9);
        }
        return uuid.join('');
    }

    addAction(callback: CallableFunction, data: any): number {
        this.counter += 1;
        this.actions[this.counter.toString()] = { callback: callback, data: data };
        return this.counter;
    }

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

    renderFile(file: string, options: object): string {
        const template = Twig.twig({ data: fs.readFileSync(file).toString('utf-8') });
        return template.render(options);
    }

    render(xml: string, options: object): string {
        const template = Twig.twig({ data: xml });        
        return template.render(options);
    }


    async display(manialink: string, login: string | string[] | undefined = undefined) {
        const xml = `<manialinks>${this.convert(manialink)}</manialinks>`;
        if (login !== undefined) {
            this.server.send('SendDisplayManialinkPageToLogin', typeof login === 'string' ? login : login.join(','), xml, 0, false)
            return;
        }
        const id = xml.match(/<manialink id="(\d+)"/);
        if (id) {
            this.publicManialinks[id[1].toString()] = xml;
        }
        this.server.send("SendDisplayManialinkPage", xml, 0, false);
    }

    async hide(id: string, login: string | string[] | undefined = undefined) {
        const manialink = `<manialinks><manialink id="${id}"></manialink></manialinks>`;
        if (login !== undefined) {
            this.server.send('SendDisplayManialinkPageToLogin', typeof login === 'string' ? login : login.join(','), manialink, 0, false)
            return;
        }
        delete this.publicManialinks[id.toString()];
        this.server.send("DisplayManialinkPage", manialink, 0, false);
    }

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