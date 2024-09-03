import ListWindow from '@core/ui/listwindow';

export default class QueueWindow extends ListWindow {

    async onAction(login: string, action: string, item: any) {
        if (action == "Drop") {
            await tmc.chatCmd.execute(login, "/drop " + item.Index);
            await this.hide();
            await tmc.chatCmd.execute(login, "/jb");
        }
    }
}