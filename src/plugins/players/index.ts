import fs from 'fs';
export class PlayersPlugin {
    template: string;
    id: string;
    close: number;

    constructor() {
        tmc.addCommand("/players", this.cmdPlayers.bind(this));
        this.id = tmc.ui.uuid();
        this.close = tmc.ui.addAction(this.uiClose.bind(this), "Close");
        this.template = fs.readFileSync(__dirname + "/templates/playerwindow.twig").toString('utf-8');
        tmc.server.on("TMC.Init", this.onInit.bind(this));
    }

    async onInit() {
       // await this.cmdPlayers(undefined, []);
    }

    async cmdPlayers(login: any, args: string[]) {       
        const manialink = tmc.ui.render(this.template, { id: this.id, players: tmc.players.players, close: this.close });
        await tmc.ui.display(manialink, login);
    }

    async uiClose(login: string, data: any) {
        await tmc.ui.hide(this.id, login);
    }

}

tmc.addPlugin("players", new PlayersPlugin);
