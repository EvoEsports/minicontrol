import type { Player } from "@core/playermanager";
import Plugin from "@core/plugins";
import Widget from '@core/ui/widget';
import { formatTime, escape, removeColors } from "@core/utils";

export default class RecordsWidget extends Plugin {
    static depends: string[] = ["records"];
    widgets: { [key: string]: Widget } = {};
    records: any[] = [];
    liveRecords: any[] = [];
    worldRecords: any[] = [];
    myIndex: number | undefined;
    private widgetType: { [login: string]: string } = {};
    private lastClick: { [login: string]: number } = {};
    

    async onLoad() {
        tmc.server.addListener("TMC.PlayerConnect", this.onPlayerConnect, this);
        tmc.server.addListener("TMC.PlayerDisconnect", this.onPlayerDisconnect, this);
        tmc.server.addListener("Plugin.Records.onSync", this.onSync, this);
        tmc.server.addListener("Plugin.liveRecords.onSync", this.onliveSync, this);
        tmc.server.addListener("Plugin.worldRecords.onSync", this.onworldSync, this);
        tmc.server.addListener("Plugin.Records.onRefresh", this.onSync, this);
        tmc.server.addListener("Plugin.Records.onUpdateRecord", this.onUpdateRecord, this);
        tmc.server.addListener("Plugin.Records.onNewRecord", this.onNewRecord, this);
    }

    async onPlayerConnect(player: Player) {
        const login = player.login;
        await this.updateWidget(login);
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

    async onUnload() {
        for (const login of Object.keys(this.widgets)) {
            delete this.widgets[login];
        }
    }

    async onSync(data: any) {
        this.records = data.records;
        await this.updateWidgets();
    }

    async onliveSync(data: any) {
        this.liveRecords = data.records;
        await this.updateWidgets();
    }

    async onworldSync(data: any) {
        this.worldRecords = data.records;
        await this.updateWidgets();
    }

    async onNewRecord(data: any) {
        this.records = data.records;
        await this.updateWidgets();
    }

    async onUpdateRecord(data: any) {
        this.records = data.records;
        await this.updateWidgets();
    }

    async updateWidgets() {
        for (const player of tmc.players.getAll()) {
            if (!this.widgetType[player.login]) {
                this.widgetType[player.login] = "server";
            }
            await this.updateWidget(player.login);
        }
        await tmc.ui.displayManialinks(Object.values(this.widgets));
    }

    async updateWidget(login: string) {
        let widget = this.widgets[login];
        let outRecords: any[] = [];

        if (!widget) {
            widget = new Widget("core/plugins/widgets/records/widget.twig");
            widget.recipient = login;
            widget.pos = { x: 121, y: 30, z: 0 };
            widget.size = { width: 38, height: 45 };
            widget.setOpenAction(this.widgetClick.bind(this));
            widget.setLiveAction(this.liveAction.bind(this));
            widget.setServerAction(this.serverAction.bind(this));
            widget.setWorldAction(this.worldAction.bind(this));
        }

        if (this.widgetType[login] == "live") {
            widget.title = "LIVE RECORDS";
            outRecords = this.liveRecords.slice(0, 5);
            this.myIndex = this.liveRecords.findIndex((val: any) => val.login == login);
            let addRecords = true;

            if (this.myIndex !== -1) {
                if (this.myIndex >= 10) {
                    addRecords = false;
                    outRecords = [...outRecords, ...this.liveRecords.slice(this.myIndex - 3, this.myIndex + 2)];
                }
            }
            if (addRecords) {
                outRecords = [...outRecords, ...this.liveRecords.slice(5, 10)];
            }
        }
        else if (this.widgetType[login] == "world") {
            widget.title = "WORLD RECORDS";
            outRecords = this.worldRecords.slice(0, 5);
            let myName = (await tmc.players.getPlayer(login)).nickname;
            this.myIndex = this.worldRecords.findIndex((val: any) => val.nickname == myName);
            let addRecords = true;

            if (this.myIndex !== -1) {
                if (this.myIndex >= 10) {
                    addRecords = false;
                    outRecords = [...outRecords, ...this.worldRecords.slice(this.myIndex - 3, this.myIndex + 2)];
                }
            }
            if (addRecords) {
                outRecords = [...outRecords, ...this.worldRecords.slice(5, 10)];
            }
        }
        else {
            widget.title = "SERVER RECORDS";

            outRecords = this.records.slice(0, 5);
            this.myIndex = this.records.findIndex((val: any) => val.login == login);
            let addRecords = true;

            if (this.myIndex !== -1) {
                if (this.myIndex >= 10) {
                    addRecords = false;
                    outRecords = [...outRecords, ...this.records.slice(this.myIndex - 3, this.myIndex + 2)];
                }
            }
            if (addRecords) {
                outRecords = [...outRecords, ...this.records.slice(5, 10)];
            }
        }

        if (this.widgetType[login] != "world") {
            for (const rec of outRecords) {
                rec.formattedTime = formatTime(rec.time); 
                rec.nickname = rec.player ? escape(rec.player.nickname) : "Unknown"; 
            }
        }

        widget.setData({ myRank: this.myIndex, records: outRecords });
        widget.size.height = 4 * outRecords.length + 1;
        if (outRecords.length < 1) {
            widget.size.height = 4;
        }

        this.widgets[login] = widget;
    }

    async widgetClick(login: string) {
        if (this.widgetType[login] === 'live') {
            await tmc.chatCmd.execute(login, "/liverecords");
        }
        else if (this.widgetType[login] === 'world') {
            await tmc.chatCmd.execute(login, "/worldrecords");
        }
        else {
            await tmc.chatCmd.execute(login, "/records");
        }
    }

    async liveAction(login: string) {
        await this.changeType(login, "live")
    }

    async serverAction(login: string) {
        await this.changeType(login, "server")
    }

    async worldAction(login: string) {
        await this.changeType(login, "world")
    }

    async changeType(login: string, type: string) {
        if (this.clickProtection(login)) {
            this.widgetType[login] = type;
            this.lastClick[login] = Date.now();
            await this.updateWidget(login)
            tmc.ui.displayManialinks([this.widgets[login]]);
        }
    }

    clickProtection(login: string) {
        const currentTime = Date.now();
        const lastClick = this.lastClick[login] || 0;
        if ((currentTime - lastClick) > 2000) {
            return true;
        }
        else {
            const msg = (`¤info¤Please wait 2 seconds.`);
            tmc.chat(msg, login);
        }
    }
}