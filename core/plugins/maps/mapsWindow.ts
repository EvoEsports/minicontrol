import ListWindow from 'core/ui/listwindow';
import { formatTime, escape } from 'core/utils';

export default class MapsWindow extends ListWindow {
   
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