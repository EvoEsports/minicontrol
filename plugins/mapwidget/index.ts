import tm from 'tm-essentials';
import fs from 'fs';
import { escape } from 'core/utils';
import Plugin from 'core/plugins';

interface Time {
    login: string;
    time: number;
}

export default class MapWidget extends Plugin {
    id: string = "";
    bestTimes: Time[] = [];
    nbCheckpoints: number = -1;
    action: string ="";
    template = "";

    async onLoad() {
        this.id = tmc.ui.uuid();
        this.action = tmc.ui.addAction(this.buttonClick.bind(this), null);
        this.template = fs.readFileSync(import.meta.dir + "/templates/info.twig", "utf8").toString();
        tmc.server.on("Trackmania.BeginMap", this.beginMap.bind(this));
        const info = tmc.maps.currentMap;
        this.nbCheckpoints = info?.NbCheckpoints || -1;
        await this.display([info]);
    }

    async onUnload() {
        tmc.ui.removeAction(this.action);
        tmc.server.removeListener("Trackmania.BeginMap", this.beginMap.bind(this));        
        tmc.ui.hide(this.id);
    }

    async beginMap(data: any) {
        this.display(data);
    }

    async display(data: any) {
        data = data[0];
        const file = tmc.ui.render(this.template, {
            id: this.id,
            action: this.action,
            author: data.AuthorNickname ? data.AuthorNickname : data.Author,
            mapname: escape(data.Name),
            authortime: tm.Time.fromMilliseconds(data.AuthorTime).toTmString()
        });
        tmc.ui.display(file);
    }

    async buttonClick(login: string, data: any) {
        tmc.chatCmd.execute(login, "/maps");
    }
}