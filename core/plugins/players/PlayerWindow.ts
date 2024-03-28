import ListWindow from 'core/ui/listwindow';

export default class PlayerWindow extends ListWindow {

    async onAction(login: string, action: string, item: any): Promise<void> {
        if (action == "Kick") {
            await tmc.chatCmd.execute(login, "//kick " + item.login);
        } else if (action == "Ban") {
            await tmc.chatCmd.execute(login, "//ban " + item.login);
        }
    }
}