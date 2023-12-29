import fs from 'fs';
import { paginate } from '../../core/utils';

const pageLength = 15;

export class PlayersPlugin {
    template: string;
    id: string;
    close: number;
    page: any = {};
    actionStart: number;
    actionPrev: number;
    actionNext: number;
    actionEnd: number;


    constructor() {
        tmc.server.on("TMC.Init", this.onInit.bind(this));
        tmc.addCommand("/players", this.cmdPlayers.bind(this));
        this.page = {};
        this.id = tmc.ui.uuid();
        this.close = tmc.ui.addAction(this.uiClose.bind(this), "Close");
        this.actionStart = tmc.ui.addAction(this.uiPaginate.bind(this), "start");
        this.actionPrev = tmc.ui.addAction(this.uiPaginate.bind(this), "prev");
        this.actionNext = tmc.ui.addAction(this.uiPaginate.bind(this), "next");
        this.actionEnd = tmc.ui.addAction(this.uiPaginate.bind(this), "end");
        this.template = fs.readFileSync(__dirname + "/templates/playerwindow.twig").toString('utf-8');
    }

    async onInit() {
       // await this.cmdPlayers("reaby", []);
    }

    async uiPaginate(login: string, action: any) {
        if (action == "start") {
            this.page[login] = 0;
        } else if (action == "prev") {
            this.page[login] -= 1;
        } else if (action == "next") {
            this.page[login] += 1;
        } else if (action == "end") {
            this.page[login] = Math.floor(tmc.players.players.length / pageLength);
        }
        if (this.page[login] < 0) this.page[login] = 0;
        if (this.page[login] > Math.floor(tmc.players.players.length / pageLength)) this.page[login] = Math.floor(tmc.players.players.length / pageLength);
        let playersArray = [];
        let x = 1;
        for (let player of tmc.players.players) {
            playersArray.push({ index: x, login: player.login, nick: player.nick, isSpectator: player.isSpectator });
            x++;
        }
        const players = paginate(playersArray, this.page[login], pageLength);
        const manialink = tmc.ui.render(this.template, { id: this.id, data: players, close: this.close, start: this.actionStart, prev: this.actionPrev, next: this.actionNext, end: this.actionEnd });
        await tmc.ui.display(manialink, login);
    }

    async cmdPlayers(login: any, args: string[]) {
        this.page[login] = 0;
        await this.uiPaginate(login, "start");
    }

    async uiClose(login: string, data: any) {
        delete this.page[login];
        await tmc.ui.hide(this.id, login);
    }

}

tmc.addPlugin("players", new PlayersPlugin);
