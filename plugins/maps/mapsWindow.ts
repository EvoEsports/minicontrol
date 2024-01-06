import { sleep } from 'bun';
import ListWindow from 'core/ui/listwindow';

export default class MapsWindow extends ListWindow {

    async onAction(login: string, action: string, item: any) {
        if (action == "Jump") {
            tmc.chatCmd.execute(login, "//jump " + item.Index);
        } else if (action == "Remove") {
            await tmc.chatCmd.execute(login, "//remove " + item.Index);
            await this.hide(login, []);
        } else if (action == "Queue") {
            tmc.chatCmd.execute(login, "/addqueue " + item.Index);
        }
    }
}