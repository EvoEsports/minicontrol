import ListWindow from "@core/ui/listwindow";

export default class PlayerListWindow extends ListWindow {

    async onAction(login: string, action: string, item: any) {
        if (action == "RemoveGuest") {
            await tmc.chatCmd.execute(login, "//guestlist remove " + item.Login);
            await tmc.chatCmd.execute(login, "//gueslist show");
        }
        if (action == "RemoveBan") {
            await tmc.chatCmd.execute(login, "//blacklist remove " + item.Login);
            await tmc.chatCmd.execute(login, "//blacklist show");
        }
    }

}