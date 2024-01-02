import ListWindow from "../../core/ui/listwindow";

export default class MapsWindow extends ListWindow {

    onAction(login: string, action: string, item: any): void {
        if (action == "Jump") {
            tmc.chatCmd.execute(login, "//jump " + item.Index);
        } else if (action == "Remove") {
            tmc.chatCmd.execute(login, "//remove " + item.Index);
        }
    }
}