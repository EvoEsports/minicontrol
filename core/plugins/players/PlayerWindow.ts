import Confirm from '@core/ui/confirm';
import ListWindow from '@core/ui/listwindow';

export default class PlayerWindow extends ListWindow {

    async onAction(login: string, action: string, item: any): Promise<void> {
        if (action == "Kick") {
            const confirm = new Confirm(login, `Kick ${item.nickname}`, this.applyCommand.bind(this), [login, "//kick " + item.login]);
            await confirm.display();
        }
        if (action == "Ban") {
            const confirm = new Confirm(login, `Ban ${item.nickname}`, this.applyCommand.bind(this), [login, "//ban " + item.login]);
            await confirm.display();
        }
        if (action == "Mute") {
            await tmc.chatCmd.execute(login, "//togglemute " + item.login);
        }
    }

    async applyCommand(login: string, action: string) {
        await tmc.chatCmd.execute(login, action);
        await tmc.chatCmd.execute(login, "/players");
    }

}