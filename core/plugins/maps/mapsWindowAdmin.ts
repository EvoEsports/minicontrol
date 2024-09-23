import Confirm from '@core/ui/confirm';
import ListWindow from '@core/ui/listwindow';
import { formatTime, escape, clone, removeColors } from '@core/utils';

export default class MapsWindowAdmin extends ListWindow {
    params: string[] = [];

    constructor(login: string, params: string[]) {
        super(login);
        this.params = params;
    }

    async uiPaginate(login: string, answer: any, entries: any): Promise<void> {
        let maps: any[] = [];
        let i = 1;
        for (const map of clone(tmc.maps.get())) {
            if (!this.params[0] || (removeColors(map.Name).toLocaleLowerCase().indexOf(this.params[0].toLocaleLowerCase()) !== -1 ||
                removeColors(map.Author).toLocaleLowerCase().indexOf(this.params[0].toLocaleLowerCase()) !== -1
            )) {
                maps.push(
                    Object.assign(map, {
                        Index: i++,
                        Name: escape(map.Name),
                        AuthorName: escape(map.AuthorNickname || map.Author || ""),
                        ATime: formatTime(map.AuthorTime || map.GoldTime),
                    })
                );
            }
        }
        this.setItems(maps);
        super.uiPaginate(login, answer, entries);
    }

    async onAction(login: string, action: string, item: any) {
        if (action == "Jump") {
            await tmc.chatCmd.execute(login, "//jump " + item.Uid);
        } else if (action == "Remove") {
            const confirm = new Confirm(login, "Confirm Remove", this.applyCommand.bind(this), [login, "//remove " + item.UId]);
            await confirm.display();
        } else if (action == "Queue") {
            await tmc.chatCmd.execute(login, "/addqueue " + item.UId);
        }
    }

    async applyCommand(login: string, action: string) {
        await tmc.chatCmd.execute(login, action);
        await this.uiPaginate(login, "", []);
    }
}