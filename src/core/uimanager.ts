import { GbxClient } from "@evotm/gbxclient";
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

    convert(text: string): string {
        if (tmc.game.Name !== "TmForever") return text;

        let out = text;
        const matches = text.matchAll(/(pos|size)="([-.\d]+)\s+([-.\d]+)"/g);
        for (let match of matches) {
            const x = (Number.parseFloat(match[2]) / 160) * 64;
            const y = (Number.parseFloat(match[3]) / 90) * 48;
            out = out.replaceAll(match[0], `${match[1]}n="${x} ${y}"`);
        }
        return out;
    }

    uuid(nb = 36) {
        const uuid = [], rnd = Math.random;
        let r;
        for (let i = 0; i < nb; i++) {
            uuid[i] = 0 | Math.floor(Math.random() * 10);
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
        await this.server.call("SendHideManialinkPage");
        if (tmc.game.Name == "TmForever") {
            await this.server.call('SendDisplayManialinkPage', this.getTmufCustomUi(), 0, false);
        }
    }

    async onManialinkAnswer(data: any) {
        const login = data[1];
        const answer = data[2].toString();
        console.log(answer);
        if (this.actions[answer]) {
            await this.actions[answer].callback(login, this.actions[answer].data);
        }
    }

    async onPlayerConnect(data: any) {
        const login = data[0];

        let multi = [];
        for (let id in this.publicManialinks) {
            multi.push(['SendDisplayManialinkPageToLogin', login, this.publicManialinks[id], 0, false]);
        }
        await this.server.gbx.multicall(multi);

        if (tmc.game.Name == "TmForever") {
            await this.server.call('SendDisplayManialinkPageToLogin', login, this.getTmufCustomUi(), 0, false);
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
            await this.server.call('SendDisplayManialinkPageToLogin', typeof login === 'string' ? login : login.join(','), xml, 0, false)
            return;
        }
        const id = xml.match(/manialink id="(\d+)"/);
        if (id) {
            this.publicManialinks[id[1].toString()] = xml;
        }
        await this.server.call("SendDisplayManialinkPage", xml, 0, false);
    }

    async hide(id: string, login: string | string[] | undefined = undefined) {
        const manialink = `<manialinks><manialink id="${id}"></manialink></manialinks>`;

        if (login !== undefined) {
            await this.server.call('SendDisplayManialinkPageToLogin', typeof login === 'string' ? login : login.join(','), manialink, 0, false)
            return;
        }
        delete this.publicManialinks[id.toString()];
        await this.server.call("DisplayManialinkPage", manialink, 0, false);

    }

    private getTmufCustomUi() {
        return `<manialinks>
        <custom_ui>
            <notice visible="false"/>
            <challenge_info visible="false"/>
            <net_infos visible="false"/>
            <chat visible="true"/>
            <checkpoint_list visible="false"/>
            <round_scores visible="true"/>
            <scoretable visible="true"/>
            <global visible="true"/>
        </custom_ui>
        </manialinks>`;
    }

}