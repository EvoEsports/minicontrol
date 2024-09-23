import Plugin from "@core/plugins";
import Widget from '@core/ui/widget';
import type { Like } from "@core/plugins/maplikes";

export default class MapLikesWidget extends Plugin {
    static depends: string[] = ["database", 'maplikes'];
    widget: Widget | null = null;
    records: any[] = [];

    async onLoad() {
        tmc.server.addListener("Plugin.MapLikes.onSync", this.onSync, this);
        this.widget = new Widget("core/plugins/widgets/maplikes/widget.twig");
        this.widget.pos = { x: 121, y: 60, z: 1 };
        this.widget.size = { width: 38, height: 11 };
        this.widget.actions['like'] = tmc.ui.addAction(this.actionLike.bind(this), 1);
        this.widget.actions['dislike'] = tmc.ui.addAction(this.actionLike.bind(this), -1);
    };


    async actionLike(login: string, value: number) {
        if (value > 0)
            await tmc.chatCmd.execute(login, "/++")
        else
            await tmc.chatCmd.execute(login, "/--")
    }

    async onUnload() {
        tmc.server.removeListener("Plugin.MapLikes.onSync", this.onSync);
        this.widget?.destroy();
        this.widget = null;
    }

    async onSync(data: Like[]) {
        await this.updateWidget(data);
    }

    async updateWidget(data: Like[]) {
        if (this.widget) {
            let positive = 0;
            let negative = 0;
            let total = 0.0001;
            let wording = "Neutral";

            for (const like of data) {
                if (like.vote > 0) {
                    positive++;
                } else {
                    negative++;
                }
                total++;
            }
            let percentage = ((positive / total * 100).toFixed(0) || 0) + "%";
            const percent = positive / total * 100;

            if (percent < 40) wording = "Not Fun";
            if (percent > 50) wording = "Fun";
            if (percent > 60) wording = "Super Fun";
            if (total <= 0) {
                percentage = "No Votes";
                wording = "Neutral";
            }


            this.widget.setData({
                percentage: percentage,
                wording: wording,
                positive: positive,
                negative: negative,
                width: (positive / total * 30).toFixed(0)
            });

            this.widget.title = "MAP KARMA ["+data.length+"]";
            await this.widget.display();
        }
    }

}