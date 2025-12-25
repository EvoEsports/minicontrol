import type { Player } from "@core/playermanager";
import Plugin from "@core/plugins";
import Widget from "@core/plugins/widgets/records/recordsWidget";
import { formatTime } from "@core/utils";

export default class RecordsWidget extends Plugin {
    widgets: { [key: string]: Widget } = {};
    performanceWidget: Widget | undefined;
    records: any[] = [];
    myIndex: number | undefined;

    update = false;
    timeout: NodeJS.Timeout | undefined = undefined;

    async onLoad() {
        this.addListener("TMC.PlayerConnect", this.onPlayerConnect, this);
        this.addListener("TMC.PlayerDisconnect", this.onPlayerDisconnect, this);
        this.addListener("Plugin.Records.onSync", this.onRecSync, this);
        this.addListener("Plugin.Records.onRefresh", this.onRecRefresh, this);
        this.addListener("Plugin.Records.onUpdateRecord", this.onUpdateRecord, this);
        this.addListener("Plugin.Records.onNewRecord", this.onNewRecord, this);
    }

    async onUnload() {

        for (const login of Object.keys(this.widgets)) {
            this.widgets[login].destroy();
            delete this.widgets[login];
        }
    }

    async onStart() {
        this.updateWidgets();
        this.triggerUpdate().catch((err) => {
            tmc.cli(`Error: ${err.message}`);
        });
    }

    async triggerUpdate() {
        if (this.update) {
            this.update = false;
            this.updateWidgets();
        }
        this.timeout = setTimeout(() => {
            this.triggerUpdate().catch((err) => {
                tmc.cli(`Error: ${err.message}`);
            });
        }, 5000);
    }

    async onPlayerConnect(player: Player) {
        const login = player.login;
        const minPlayers = tmc.settings.get("widgets.performance") ?? 35;
        if (tmc.players.getAllLogins().length >= minPlayers) return;

        this.updateWidget(login);
        if (this.widgets[login]) {
            tmc.ui.displayManialink(this.widgets[login]);
        }
    }

    async onPlayerDisconnect(player: Player) {
        const login = player.login;
        if (this.widgets[login]) {
            delete this.widgets[login];
        }
    }

    async onRecSync(data: any) {
        this.update = true;
        this.updateWidgets();
    }

    async onRecRefresh(data: any) {
        this.update = true;
    }

    async onNewRecord(data: any) {
        this.update = true;
    }

    async onUpdateRecord(data: any) {
        this.update = true;
    }

    async updateWidgets() {
        const minPlayers = tmc.settings.get("widgets.performance") ?? 35;

        const logins = tmc.players.getAllLogins();
        if (logins.length >= minPlayers) {
            this.updatePerformanceWidget();
            return;
        }

        this.performanceWidget?.destroy();
        this.performanceWidget = undefined;

        for (const login of logins) {
            this.updateWidget(login);
        }

        tmc.ui.displayManialinks(Object.values(this.widgets));
    }

    async updatePerformanceWidget() {
        if (!this.performanceWidget) {
            const widget = new Widget(undefined);
            if (tmc.game.Name === "TmForever") {
                widget.pos = { x: -159, y: 38, z: 0 };
            } else {
                widget.pos = { x: 121, y: 30, z: 0 };
            }
            widget.size = { width: 38, height: 45 };
            widget.setOpenAction(this.widgetClick.bind(this));
            this.performanceWidget = widget;
        }

        const records = tmc.getPlugin("records").records;
        const outRecords = records.slice(0, 10).map((r: any) => (r && typeof r.toJSON === 'function' ? r.toJSON() : r));
        this.performanceWidget.setData({ records: outRecords, game: tmc.game.Name });
        this.performanceWidget.size.height = 4 * outRecords.length + 5;
        if (outRecords.length < 1) {
            this.performanceWidget.size.height = 8;
        }
        this.performanceWidget.display();
    }

    async updateWidget(login: string) {
        let widget = this.widgets[login];
        let outRecords: any[] = [];

        if (!widget) {
            widget = new Widget(login);
            if (tmc.game.Name === "TmForever") {
                widget.pos = { x: -159, y: 38, z: 0 };
            } else {
                widget.pos = { x: 121, y: 30, z: 0 };
            }
            widget.size = { width: 38, height: 45 };
            widget.setOpenAction(this.widgetClick.bind(this));
        }
        const records = tmc.getPlugin("records").records;

        outRecords = records.slice(0, 5);
        this.myIndex = records.findIndex((val: any) => val.login === login);
        let addRecords = true;

        if (this.myIndex !== -1) {
            if (this.myIndex >= 10) {
                addRecords = false;
                outRecords = [...outRecords, ...records.slice(this.myIndex - 3, this.myIndex + 2)];
            }
        }
        if (addRecords) {
            outRecords = [...outRecords, ...records.slice(5, 10)];
        }

        // Convert Sequelize model instances to plain objects so includes like `player` are present
        outRecords = outRecords.map((r: any) => (r && typeof r.toJSON === "function" ? r.toJSON() : r));

        widget.setData({ myRank: this.myIndex, records: outRecords });
        widget.size.height = 4 * outRecords.length + 5;
        if (outRecords.length < 1) {
            widget.size.height = 8;
        }
        this.widgets[login] = widget;
    }

    async widgetClick(login: string) {
        await tmc.chatCmd.execute(login, "/records");

    }

}
