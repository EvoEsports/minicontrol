import ListWindow from "core/ui/listwindow.ts";
import Records from "core/plugins/records/index.ts";

export default class RecordsWindow extends ListWindow {
    app: Records;

    constructor(login: string, app: Records) {
        super(login);
        this.app = app;
    }

    async onAction(login: string, action: string, item: any): Promise<void> {
        if (action === "Delete") {
            await this.app.deleteRecord(login, item);
        }
    }
}