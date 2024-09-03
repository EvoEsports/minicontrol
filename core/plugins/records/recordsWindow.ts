import ListWindow from "@core/ui/listwindow.ts";
import Records from "@core/plugins/records/index.ts";
import Confirm from "@core/ui/confirm";

export default class RecordsWindow extends ListWindow {
    app: Records;

    constructor(login: string, app: Records) {
        super(login);
        this.app = app;
    }

    async onAction(login: string, action: string, item: any): Promise<void> {
        if (action === "Delete") {
            const confirm = new Confirm(login, `Delete record by ${item.nickname} $z$s(no undo)`, this.applyCommand.bind(this), [login, item]);
            await confirm.display();
        }
    }

    async applyCommand(login: string, item: any) {
        await this.app.deleteRecord(login, item);
    }

}