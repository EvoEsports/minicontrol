import ListWindow from "@core/ui/listwindow";

export default class PlayerListWindow extends ListWindow {

    async onAction(login: string, action: string, item: any) {
        if (action == "UnBan") {
            await tmc.chatCmd.execute(login, "//banlist remove " + item.Login);
            await tmc.chatCmd.execute(login, "//banlist show");
        }
        if (action == "UnIgnore") {
            await tmc.chatCmd.execute(login, "//ignorelist remove " + item.Login);
            await tmc.chatCmd.execute(login, "//ignorelist show");
        }
        if (action == "RemoveGuest") {
            await tmc.chatCmd.execute(login, "//guestlist remove " + item.Login);
            await tmc.chatCmd.execute(login, "//guestlist show");
        }
        if (action == "RemoveBlacklist") {
            await tmc.chatCmd.execute(login, "//blacklist remove " + item.Login);
            await tmc.chatCmd.execute(login, "//blacklist show");
        }
    }
}