import type { Player } from '@core/playermanager';
import Plugin from '@core/plugins';
import type { DediRecord } from '@core/plugins/tmnf/dedimania';
import recordsWidget from '@core/plugins/widgets/records/recordsWidget';
import { formatTime, escape } from '@core/utils';

export default class RecordsWidget extends Plugin {
    static depends: string[] = ['records'];
    widgets: { [key: string]: recordsWidget } = {};
    records: any[] = [];
    liveRecords: any[] = [];
    worldRecords: any[] = [];
    dediRecords: DediRecord[] = [];
    myIndex: number | undefined;
    private widgetType: { [login: string]: string } = {};
    private lastClick: { [login: string]: number } = {};

    async onLoad() {
        tmc.server.addListener('TMC.PlayerConnect', this.onPlayerConnect, this);
        tmc.server.addListener('TMC.PlayerDisconnect', this.onPlayerDisconnect, this);
        tmc.server.addListener('Plugin.Records.onSync', this.onSync, this);
        tmc.server.addListener('Plugin.liveRecords.onSync', this.onLiveSync, this);
        tmc.server.addListener('Plugin.worldRecords.onSync', this.onWorldSync, this);
        tmc.server.addListener('Plugin.Dedimania.onSync', this.onDediSync, this);
        tmc.server.addListener('Plugin.Dedimania.onNewRecord', this.onDediUpdate, this);
        tmc.server.addListener('Plugin.Records.onRefresh', this.onSync, this);
        tmc.server.addListener('Plugin.Records.onUpdateRecord', this.onUpdateRecord, this);
        tmc.server.addListener('Plugin.Records.onNewRecord', this.onNewRecord, this);
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

    async onLiveSync(data: any) {
        this.liveRecords = data.records;
        await this.updateWidgets();
    }

    async onWorldSync(data: any) {
        this.worldRecords = data.records;
        await this.updateWidgets();
    }

    async onDediSync(data: any) {
        this.dediRecords = data;
    }

    async onDediUpdate(data: any) {
        this.dediRecords = data.records;
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
                this.widgetType[player.login] = 'server';
            }
            await this.updateWidget(player.login);
        }
        await tmc.ui.displayManialinks(Object.values(this.widgets));
    }

    async updateWidget(login: string) {
        let widget = this.widgets[login];
        let outRecords: any[] = [];

        if (!widget) {
            this.widgetType[login] = "server";
            widget = new recordsWidget('core/plugins/widgets/records/widget.twig');
            widget.recipient = login;
            widget.pos = { x: 121, y: 30, z: 0 };
            widget.size = { width: 38, height: 45 };
            widget.setOpenAction(this.widgetClick.bind(this));
            widget.setLiveAction(this.liveAction.bind(this));
            widget.setServerAction(this.serverAction.bind(this));
            widget.setWorldAction(this.worldAction.bind(this));
        }

        if (this.widgetType[login] == 'live') {
            // widget.title = 'LIVE RECORDS';
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
        } else if (this.widgetType[login] == 'world') {
            // widget.title = 'WORLD RECORDS';
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
        } else if (this.widgetType[login] == 'server') {
            //  widget.title = 'SERVER RECORDS';

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
        } else if (this.widgetType[login] == 'dedimania') {
            // widget.title = 'DEDIMANIA RECORDS';
            outRecords = this.dediRecords.slice(0, 5);
            let myName = login;
            this.myIndex = this.dediRecords.findIndex((val: DediRecord) => val.Login == myName);
            let addRecords = true;

            if (this.myIndex !== -1) {
                if (this.myIndex >= 10) {
                    addRecords = false;
                    outRecords = [...outRecords, ...this.dediRecords.slice(this.myIndex - 3, this.myIndex + 2)];
                }
            }
            if (addRecords) {
                outRecords = [...outRecords, ...this.dediRecords.slice(5, 10)];
            }
        }

        if (['live', 'server'].includes(this.widgetType[login])) {
            for (const rec of outRecords) {
                rec.formattedTime = formatTime(rec.time);
                rec.nickname = rec.player ? escape(rec.player.nickname) : 'Unknown';
            }
        }

        if (this.widgetType[login] == 'dedimania') {
            for (const rec of outRecords) {
                rec.rank = rec.Rank;
                rec.formattedTime = formatTime(rec.Best);
                rec.nickname = escape(rec.NickName);
            }
        }

        widget.setData({ myRank: this.myIndex, records: outRecords, type: this.widgetType[login] });
        widget.size.height = 4 * outRecords.length + 5;
        if (outRecords.length < 1) {
            widget.size.height = 8;
        }

        this.widgets[login] = widget;
    }

    async widgetClick(login: string) {
        if (this.widgetType[login] === 'live') {
            await tmc.chatCmd.execute(login, '/liverecords');
        } else if (this.widgetType[login] === 'world') {
            await tmc.chatCmd.execute(login, '/worldrecords');
        } else if (this.widgetType[login] === 'server') {
            await tmc.chatCmd.execute(login, '/records');
        } else if (this.widgetType[login] === 'dedimania') {
            await tmc.chatCmd.execute(login, '/dedirecords');
        }
    }

    async liveAction(login: string) {
        await this.changeType(login, 'live');
    }

    async serverAction(login: string) {
        await this.changeType(login, 'server');
    }

    async worldAction(login: string) {
        if (tmc.game.Name == 'TmForever') {
            await this.changeType(login, 'dedimania');
            return;
        }
        if (tmc.game.Name == 'Trackmania') {
            await this.changeType(login, 'world');
            return;
        }
    }

    async changeType(login: string, type: string) {
        if (this.clickProtection(login)) {
            this.widgetType[login] = type;
            this.lastClick[login] = Date.now();
            await this.updateWidget(login);
            tmc.ui.displayManialinks([this.widgets[login]]);
        }
    }

    clickProtection(login: string) {
        const currentTime = Date.now();
        const lastClick = this.lastClick[login] || 0;
        if (currentTime - lastClick > 500) {
            return true;
        } else {
            const msg = `¤info¤Please wait ¤white¤0.5 ¤info¤seconds.`;
            tmc.chat(msg, login);
        }
    }
}
