import Plugin from '../../../plugins';
import Widget from '../../../ui/widget';
import { formatTime, escape } from '../../../utils';

export default class DedimaniaWidget extends Plugin {
    static depends: string[] = ["tmnf/dedimania"];
    widget: Widget | null = null;

    async onLoad() {
        this.widget = new Widget("core/plugins/widgets/dedimania/widget.twig");
        this.widget.title = "Dedimania";
        this.widget.pos = { x: -160, y: 30 };
        this.widget.size = { width: 45, height: 45 };
        this.widget.setOpenAction(this.widgetClick.bind(this));
        tmc.server.addListener('Plugin.Dedimania.onSync', this.onSync, this);
        tmc.server.addListener('Plugin.Dedimania.onNewRecord', this.onUpdate, this);
    }

    async onUnload() {
        this.widget?.destroy();
        this.widget = null;
        tmc.server.removeListener('Plugin.Dedimania.onSync', this.onSync);
        tmc.server.removeListener('Plugin.Dedimania.onNewRecord', this.onUpdate);
    }

    async onSync(records: any) {
        await this.updateWidget(records);
    }

    async onUpdate(data: any) {
        await this.updateWidget(data.records);
    }

    async updateWidget(records: any) {
        let outRecords = [];
        let x = 0;
        for (const record of records) {
            if (x >= 10) break;

            outRecords.push(
                {
                    rank: record.Rank,
                    nickname: escape(record.NickName),
                    time: formatTime(record.Best),
                });
            x += 1;
        }
        const lastRecord: any = records[records.length - 1];
        if (lastRecord != undefined && lastRecord.Rank > 10) {
            outRecords.push(
                {
                    rank: lastRecord.Rank,
                    nickname: escape(lastRecord.NickName),
                    time: formatTime(lastRecord.Best),
                }
            )
        }
        if (this.widget) {
            this.widget.setData({
                records: outRecords
            });
            this.widget.size = { width: 45, height: 4 * outRecords.length + 1 };
            await this.widget.display();
        }
    }

    async widgetClick(login: string, data: any) {
        await tmc.chatCmd.execute(login, "/dedirecords");
    }

}