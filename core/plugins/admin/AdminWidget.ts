import Widget from "@core/ui/widget";

export default class AdminWidget extends Widget {
    constructor(login: string) {
        super("widget.xml.twig");
        this.recipient = login;
        this.data.buttons = [];
        this.addButton(0, "Prev", "", async (login: string, item: any) => {
            tmc.chatCmd.execute(login, "//prev");
        });
        this.addButton(1, "Res", "", async (login: string, item: any) => {
            tmc.chatCmd.execute(login, "//res");
        });
        this.addButton(2, "Skip", "", async (login: string, item: any) => {
            tmc.chatCmd.execute(login, "//skip");
        });
        this.addButton(3, "ER", "", async (login: string, item: any) => {
            tmc.chatCmd.execute(login, "//er");
        });
        this.addButton(4, "Pass", "", async (login: string, item: any) => {
            tmc.chatCmd.execute(login, "//pass");
        });
        this.addButton(5, "Cancel", "", async (login: string, item: any) => {
            tmc.chatCmd.execute(login, "//cancel");
        });
        if (tmc.plugins.votes) {
            this.addButton(6, "+ 5min", "", async (login: string, item: any) => {
                tmc.chatCmd.execute(login, "//extend 300");
            });
            this.addButton(7, "- 5min", "", async (login: string, item: any) => {
                tmc.chatCmd.execute(login, "//extend -300");
            });
        }
    }

    addButton(id: number, text: string, color: string, callback: CallableFunction) {
        const action = tmc.ui.addAction(callback, {});
        this.actions[`button_${id}`] = action;
        this.data.buttons.push({ id, text, color, action });
    }
}
