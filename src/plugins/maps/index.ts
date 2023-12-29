import fs from 'fs';
import { paginate } from '../../core/utils';
import tm from 'tm-essentials';

const pageLength = 20;

export class MapsPlugin {
    template: string;
    id: string;
    close: number;
    page: any = {};
    actionStart: number;
    actionPrev: number;
    actionNext: number;
    actionEnd: number;
    mapsList: any;

    constructor() {
        tmc.server.on("TMC.Init", this.onInit.bind(this));
        tmc.addCommand("/maps", this.cmdMaps.bind(this));
        tmc.addCommand("/list", this.cmdMaps.bind(this));
        this.page = {};
        this.id = tmc.ui.uuid();
        this.close = tmc.ui.addAction(this.uiClose.bind(this), "Close");
        this.actionStart = tmc.ui.addAction(this.uiPaginate.bind(this), "start");
        this.actionPrev = tmc.ui.addAction(this.uiPaginate.bind(this), "prev");
        this.actionNext = tmc.ui.addAction(this.uiPaginate.bind(this), "next");
        this.actionEnd = tmc.ui.addAction(this.uiPaginate.bind(this), "end");
        this.template = fs.readFileSync(__dirname + "/templates/mapswindow.twig").toString('utf-8');
    }

    async onInit() {
        // await this.cmdMaps("EdbzfLXMS_aI_PjZCVaygQ", []);
    }

    async uiPaginate(login: string, action: any) {
        if (action == "start") {
            this.page[login] = 0;
        } else if (action == "prev") {
            this.page[login] -= 1;
        } else if (action == "next") {
            this.page[login] += 1;
        } else if (action == "end") {
            this.page[login] = Math.floor(this.mapsList.length / pageLength);
        }
        if (this.page[login] < 0) this.page[login] = 0;
        if (this.page[login] > Math.floor(this.mapsList.length / pageLength)) this.page[login] = Math.floor(this.mapsList.length / pageLength);
        let mapsArray = [];
        let x = 1;
        for (let map of this.mapsList) {
            let author =  map.AuthorNickname?map.AuthorNickname:map.Author;
            if (author == "") author = "Nadeo";            
            mapsArray.push({ 
                index: x, 
                name: map.Name, 
                authorName: author, 
                environment: map.Environnement, 
                goldTime: tm.Time.fromMilliseconds(map.GoldTime).toTmString(),
                mapUid: map.UId
            });
            x++;
        }

        const players = paginate(mapsArray, this.page[login], pageLength);
        const manialink = tmc.ui.render(this.template, { id: this.id, data: players, close: this.close, start: this.actionStart, prev: this.actionPrev, next: this.actionNext, end: this.actionEnd });
        await tmc.ui.display(manialink, login);
    }

    async cmdMaps(login: any, args: string[]) {
        this.page[login] = 0;
        this.mapsList = await tmc.server.call("GetMapList", -1, 0);        
        await this.uiPaginate(login, "start");
    }

    async uiClose(login: string, data: any) {
        delete this.page[login];
        await tmc.ui.hide(this.id, login);
    }

}

tmc.addPlugin("maps", new MapsPlugin);
