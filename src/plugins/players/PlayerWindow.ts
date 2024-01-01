import ListWindow from "../../core/ui/listwindow";

export default class PlayerWindow extends ListWindow {

    onAction(login: string, action: string, item: any): void {
        if (action == "Kick") {
            tmc.chatCmd.execute(login, "//kick " + item.Login);
        } else if (action == "Ban") {
            tmc.chatCmd.execute(login, "//ban " + item.Login);
        }
    }
}