import ListWindow from 'core/ui/listwindow';
import { formatTime, escape } from 'core/utils';

export default class MapsWindow extends ListWindow {

    async uiPaginate(login: string, answer: any, entries: any): Promise<void> {
        let maps: any[] = [];
        let i = 1;
        for (const map of tmc.maps.get()) {
            maps.push(
                Object.assign(map, {
                    Index: i++,
                    Name: escape(map.Name),
                    Author: map.AuthorNickname || map.Author,
                    GoldTime: formatTime(map.GoldTime)
                })
            );
        }        
        this.setItems(maps);
        await super.uiPaginate(login, answer, entries);
    }
    
    async onAction(login: string, action: string, item: any) {
        if (action == "Jump") {
            await tmc.chatCmd.execute(login, "//jump " + item.Uid);
        } else if (action == "Delete") {
            await tmc.chatCmd.execute(login, "//remove " + item.UId);
            await this.uiPaginate(login, "", []);
        } else if (action == "Queue") {
            await tmc.chatCmd.execute(login, "/addqueue " + item.UId);
        }
    }
}