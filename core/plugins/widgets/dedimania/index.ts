import type { Player } from "@core/playermanager";
import Plugin from "@core/plugins";
import type { DediRecord } from "@core/plugins/tmnf/dedimania";
import Widget from "@core/ui/widget";
import { formatTime, htmlEntities } from "@core/utils";

export default class DedimaniaWidget extends Plugin {
    records: DediRecord[] = [];
    widgets: { [key: string]: Widget } = {};

    async onLoad() {
        this.addListener("TMC.PlayerConnect", this.onPlayerConnect, this);
        this.addListener("TMC.PlayerDisconnect", this.onPlayerDisconnect, this);
        this.addListener("Plugin.Dedimania.onSync", this.onSync, this);
        this.addListener("Plugin.Dedimania.onNewRecord", this.onUpdate, this);
    }

    async onUnload() {
        for (const login of Object.keys(this.widgets)) {
            await this.widgets[login].destroy();
            delete this.widgets[login];
        }
        this.widgets = {};
    }

    async onPlayerConnect(player: Player) {
        const login = player.login;
        this.updateWidget(login);
        if (this.widgets[login]) {
            await tmc.ui.displayManialink(this.widgets[login]);
        }
    }

    async onPlayerDisconnect(player: Player) {
        const login = player.login;
        if (this.widgets[login]) {
            delete this.widgets[login];
        }
    }

    async onSync(records: any) {
        this.records = records;
        await this.updateWidgets();
    }

    async onUpdate(data: any) {
        this.records = data.records;
        await this.updateWidgets();
    }

    async updateWidgets() {
        for (const player of tmc.players.getAll()) {
            this.updateWidget(player.login);
        }
        await tmc.ui.displayManialinks(Object.values(this.widgets));
    }

    updateWidget(login: string) {
        let widget = this.widgets[login];
        if (!widget) {
            widget = new Widget("core/plugins/widgets/dedimania/widget.xml.twig");
            widget.title = "DEDIMANIA";
            widget.recipient = login;
            widget.pos = { x: 121, y: 35, z: 0 };
            widget.size = { width: 38, height: 45 };
            widget.setOpenAction(this.widgetClick.bind(this));
        }

        let outRecords: any[] = this.records.slice(0, 5);
        const myIndex = this.records.findIndex((val: any) => val.login === login);

        let addRecords = true;
        if (myIndex !== -1) {
            if (myIndex >= 10) {
                addRecords = false;
                outRecords = [...outRecords, ...this.records.slice(myIndex - 3, myIndex + 2)];
            }
        }
        if (addRecords) {
            outRecords = [...outRecords, ...this.records.slice(5, 10)];
        }

        for (const rec of outRecords) {
            rec.rank = rec.Rank;
            rec.formattedTime = formatTime(rec.Best);
            rec.nickname = htmlEntities(rec.NickName);
        }

        widget.setData({ records: outRecords });
        widget.size.height = 4 * outRecords.length + 1;
        if (outRecords.length === 0) {
            widget.size.height = 4;
        }
        this.widgets[login] = widget;
    }

    async widgetClick(login: string, data: any) {
        await tmc.chatCmd.execute(login, "/dedirecords");
    }
}
