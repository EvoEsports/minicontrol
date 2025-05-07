import type { Player } from '@core/playermanager';
import Plugin from '@core/plugins';
import type { DediRecord } from '@core/plugins/tmnf/dedimania';
import recordsWidget from '@core/plugins/widgets/records/recordsWidget';
import { formatTime, htmlEntities } from '@core/utils';

export default class RecordsWidget extends Plugin {
    static depends: string[] = ['widgets', 'records'];
    widgets: { [key: string]: recordsWidget } = {};
    records: any[] = [];
    liverankings: any[] = [];
    worldRecords: any[] = [];
    dediRecords: DediRecord[] = [];
    myIndex: number | undefined;
    private widgetType: { [login: string]: string } = {};
    private lastClick: { [login: string]: number } = {};
    update = false;
    timeout: NodeJS.Timeout | undefined = undefined;

    async onLoad() {
        tmc.server.addListener('TMC.PlayerConnect', this.onPlayerConnect, this);
        tmc.server.addListener('TMC.PlayerDisconnect', this.onPlayerDisconnect, this);
        tmc.server.addListener('Plugin.LiveRankings.onSync', this.onLiveSync, this);
        tmc.server.addListener('Plugin.WorldRecords.onSync', this.onWorldSync, this);
        tmc.server.addListener('Plugin.Dedimania.onSync', this.onDediSync, this);
        tmc.server.addListener('Plugin.Dedimania.onNewRecord', this.onDediUpdate, this);
        tmc.server.addListener('Plugin.Records.onSync', this.onRecSync, this);
        tmc.server.addListener('Plugin.Records.onRefresh', this.onRecRefresh, this);
        tmc.server.addListener('Plugin.Records.onUpdateRecord', this.onUpdateRecord, this);
        tmc.server.addListener('Plugin.Records.onNewRecord', this.onNewRecord, this);
    }

    async onUnload() {
        tmc.server.removeListener('TMC.PlayerConnect', this.onPlayerConnect);
        tmc.server.removeListener('TMC.PlayerDisconnect', this.onPlayerDisconnect);
        tmc.server.removeListener('Plugin.LiveRankings.onSync', this.onLiveSync);
        tmc.server.removeListener('Plugin.WorldRecords.onSync', this.onWorldSync);
        tmc.server.removeListener('Plugin.Dedimania.onSync', this.onDediSync);
        tmc.server.removeListener('Plugin.Dedimania.onNewRecord', this.onDediUpdate);
        tmc.server.removeListener('Plugin.Records.onSync', this.onRecSync);
        tmc.server.removeListener('Plugin.Records.onRefresh', this.onRecRefresh);
        tmc.server.removeListener('Plugin.Records.onUpdateRecord', this.onUpdateRecord);
        tmc.server.removeListener('Plugin.Records.onNewRecord', this.onNewRecord);
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
        const minPlayers = tmc.settings.get('widgets.performance') ?? 35;
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
        this.records = data.records;
        this.update = true;
        this.updateWidgets();
    }

    async onRecRefresh(data: any) {
        this.records = data.records;
        this.update = true;
    }

    async onLiveSync(data: any) {
        this.liverankings = data.records;
        this.update = true;
    }

    async onWorldSync(data: any) {
        this.worldRecords = data.records;
        this.update = true;
    }

    async onDediSync(data: any) {
        this.dediRecords = data;
        this.update = true;
    }

    async onDediUpdate(data: any) {
        this.dediRecords = data.records;
        this.update = true;
    }

    async onNewRecord(data: any) {
        this.records = data.records;
        this.update = true;
    }

    async onUpdateRecord(data: any) {
        this.records = data.records;
        this.update = true;
    }

    async updateWidgets() {
        const minPlayers = tmc.settings.get('widgets.performance') ?? 35;
        const logins = tmc.players.getAllLogins();
        if (logins.length >= minPlayers) {
            return;
        }

        for (const login of logins) {
            if (!this.widgetType[login]) {
                this.widgetType[login] = 'server';
            }
            this.updateWidget(login);
        }
        tmc.ui.displayManialinks(Object.values(this.widgets));
    }

    async updateWidget(login: string) {
        let widget = this.widgets[login];
        let outRecords: any[] = [];

        if (!widget) {
            this.widgetType[login] = 'server';
            widget = new recordsWidget('core/plugins/widgets/records/widget.xml.twig');
            widget.title = 'RECORDS';
            widget.recipient = login;
            if (tmc.game.Name === 'TmForever') {
                widget.pos = { x: -159, y: 38, z: 0 };
            } else {
                widget.pos = { x: 121, y: 30, z: 0 };
            }
            widget.size = { width: 38, height: 45 };
            widget.setOpenAction(this.widgetClick.bind(this));
            widget.setLiveAction(this.liveAction.bind(this));
            widget.setServerAction(this.serverAction.bind(this));
            widget.setWorldAction(this.worldAction.bind(this));
        }

        if (this.widgetType[login] === 'live') {
            outRecords = this.liverankings.slice(0, 5);
            this.myIndex = this.liverankings.findIndex((val: any) => val.login === login);
            let addRecords = true;

            if (this.myIndex !== -1) {
                if (this.myIndex >= 10) {
                    addRecords = false;
                    outRecords = [...outRecords, ...this.liverankings.slice(this.myIndex - 3, this.myIndex + 2)];
                }
            }
            if (addRecords) {
                outRecords = [...outRecords, ...this.liverankings.slice(5, 10)];
            }
        } else if (this.widgetType[login] === 'world') {
            outRecords = this.worldRecords.slice(0, 5);
            const myName = (await tmc.players.getPlayer(login)).nickname;
            this.myIndex = this.worldRecords.findIndex((val: any) => val.nickname === myName);
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
        } else if (this.widgetType[login] === 'server') {
            outRecords = this.records.slice(0, 5);
            this.myIndex = this.records.findIndex((val: any) => val.login === login);
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
        } else if (this.widgetType[login] === 'dedimania') {
            outRecords = this.dediRecords.slice(0, 5);
            const myName = login;
            this.myIndex = this.dediRecords.findIndex((val: DediRecord) => val.Login === myName);
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
                rec.nickname = rec.player ? htmlEntities(rec.player?.customNick ?? rec.player?.nickname ?? '') : 'Unknown';
            }
        }

        if (this.widgetType[login] === 'dedimania') {
            for (const rec of outRecords) {
                rec.rank = rec.Rank;
                rec.formattedTime = formatTime(rec.Best);
                rec.nickname = htmlEntities(rec.NickName);
            }
        }

        widget.setData({ myRank: this.myIndex, records: outRecords, type: this.widgetType[login], game: tmc.game.Name });
        widget.size.height = 4 * outRecords.length + 5;
        if (outRecords.length < 1) {
            widget.size.height = 8;
        }

        this.widgets[login] = widget;
    }

    async widgetClick(login: string) {
        if (this.widgetType[login] === 'live') {
            await tmc.chatCmd.execute(login, '/liverankings');
        } else if (this.widgetType[login] === 'world') {
            await tmc.chatCmd.execute(login, '/worldrecords');
        } else if (this.widgetType[login] === 'server') {
            await tmc.chatCmd.execute(login, '/records');
        } else if (this.widgetType[login] === 'dedimania') {
            await tmc.chatCmd.execute(login, '/dedirecords');
        }
    }

    async liveAction(login: string) {
        this.changeType(login, 'live');
    }

    async serverAction(login: string) {
        this.changeType(login, 'server');
    }

    async worldAction(login: string) {
        if (tmc.game.Name === 'TmForever') {
            this.changeType(login, 'dedimania');
            return;
        }
        if (tmc.game.Name === 'Trackmania') {
            this.changeType(login, 'world');
            return;
        }
    }

    async changeType(login: string, type: string) {
        if (this.clickProtection(login)) {
            this.widgetType[login] = type;
            this.lastClick[login] = Date.now();
            this.updateWidget(login);
            this.widgets[login].display();
        }
    }

    clickProtection(login: string) {
        const currentTime = Date.now();
        const lastClick = this.lastClick[login] || 0;
        if (currentTime - lastClick > 500) {
            return true;
        }
        const msg = '¤info¤Please wait ¤white¤0.5 ¤info¤seconds.';
        tmc.chat(msg, login);
    }
}
