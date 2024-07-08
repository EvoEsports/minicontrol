import Plugin from "../../../plugins";
import Widget from '../../../ui/widget';
import type { Like } from "../../../plugins/maplikes";

export default class MapLikesWidget extends Plugin {
    static depends: string[] = ["database", 'maplikes'];
    widget: Widget | null = null;
    records: any[] = [];

    async onLoad() {
        tmc.server.addListener("Plugin.MapLikes.onSync", this.onSync, this);
        this.widget = new Widget("core/plugins/widgets/maplikes/widget.twig");      
        this.widget.pos = { x: 115, y: 60 };   
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
            let total = 0.0001;

            for (const like of data) {
                if (like.vote > 0) {
                    positive++;
                }
                total++;
            }
            let percentage = ((positive / total * 100).toFixed(0) || 0) + "%";
            if (total < 1) percentage = "No Votes";
            this.widget.setData({
                percentage: percentage,
                width: (positive / total * 30).toFixed(0)
            });
            this.widget.title = "Map Likes ["+data.length+"]";
            this.widget.size = { width: 45, height: 6 };
            await this.widget.display();
        }
    }

}