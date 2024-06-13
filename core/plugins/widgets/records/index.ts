import Plugin from "core/plugins";
import Widget from 'core/ui/widget';
import { formatTime, escape } from "core/utils";

export default class RecordsWidget extends Plugin {
    static depends: string[] = ["records"];
    widget: Widget | null = null;
    records: any[] = [];

    async onLoad() {
        tmc.server.addListener("Plugin.Records.onSync", this.onSync, this);
        tmc.server.addListener("Plugin.Records.onRefresh", this.onSync, this);
        tmc.server.addListener("Plugin.Records.onUpdateRecord", this.onUpdateRecord, this);
        tmc.server.addListener("Plugin.Records.onNewRecord", this.onNewRecord, this);

        this.widget = new Widget("core/plugins/widgets/records/widget.twig");
        this.widget.title = "Records";
        this.widget.pos = { x: 115, y: 30 };
        this.widget.size = { width: 45, height: 45 };
        this.widget.setOpenAction(this.widgetClick.bind(this));
    }

    async onUnload() {
        this.widget?.destroy();
        this.widget = null;
    }

    async onSync(data: any) {
        this.records = data.records;
        await this.updateWidget();
    }


    async onNewRecord(data: any) {
        this.records = data.records;
        await this.updateWidget();
    }

    async onUpdateRecord(data: any) {
        this.records = data.records;
        await this.updateWidget();
    }


    async updateWidget() {
        let outRecords = [];
        let x = 0;
        for (let record of this.records) {
            if (x >= 10) break;  
            outRecords.push(
                {
                    rank: record.rank,
                    nickname: escape(record.nickname),
                    time: formatTime(record.time).replace(/^0:/, ""),
                });
            x += 1;
        }
        const lastRecord: any = this.records[this.records.length - 1];
        if (lastRecord != undefined && lastRecord.Rank > 10) {
            outRecords.push(
                {
                    rank: lastRecord.Rank,
                    nickname: escape(lastRecord.NickName),
                    time: formatTime(lastRecord.time).replace(/^0:/, ""),
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
        await tmc.chatCmd.execute(login, "/records");
    }
    
}