import Confirm from "@core/ui/confirm";
import ListWindow from "@core/ui/listwindow";
import { htmlEntities } from "@core/utils";

export default class MapsWindow extends ListWindow {
    params: string[] = [];
    // template: string = 'core/plugins/maps/maplist.xml.twig';
    pageSize = 20;

    constructor(login: string, params: string[]) {
        super(login);
        this.params = params;
        this.recipient = login;
    }

    async onAction(login: string, action: string, item: any) {
        if (action === "Queue") {
            tmc.chatCmd.execute(login, `/addqueue ${item.UId}`);
        }
        if (action === "Records") {
            tmc.chatCmd.execute(login, `/records ${item.UId}`);
        }
        if (action === "Remove") {
            const confirm = new Confirm(login, `Remove ${item.Name}`, this.applyCommand.bind(this), [login, `//remove ${item.UId}`]);
            await confirm.display();
        }
    }

    async applyCommand(login: string, action: string) {
        await tmc.chatCmd.execute(login, action);
        await tmc.chatCmd.execute(login, `/list ${this.params.join(" ")}`);
    }
}
