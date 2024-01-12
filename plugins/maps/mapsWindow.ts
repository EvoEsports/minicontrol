import ListWindow from 'core/ui/listwindow';
import { formatTime, escape } from 'core/utils';

export default class MapsWindow extends ListWindow {

    uiPaginate(login: string, answer: any, entries: any): void {
        let maps: any[] = [];
        let i = 1;
        for (const map of tmc.maps.get()) {
            maps.push(
                Object.assign(map, {
                    Index: i++,
                    Name: escape(map.Name),
                    Author: map.AuthorNickname ? map.AuthorNickname : map.Author,
                    GoldTime: formatTime(map.GoldTime)
                })
            );
        }        
        this.setItems(maps);
        super.uiPaginate(login, answer, entries);
    }
    async onAction(login: string, action: string, item: any) {
        if (action == "Jump") {
            tmc.chatCmd.execute(login, "//jump " + item.Uid);
        } else if (action == "Trash") {                     
            await tmc.chatCmd.execute(login, "//remove " + item.UId);
            await this.uiPaginate(login, "", []);
        } else if (action == "Juke") {
            tmc.chatCmd.execute(login, "/addqueue " + item.UId);
        }
    }
}