import Plugin from "@core/plugins";
import Widget from "@core/ui2/widget";
import MapLikesComponent from "./MaplikesWidget.tsx";

import type { Like } from "@core/plugins/maplikes";

export default class MapLikesWidget extends Plugin {
    widget: Widget | undefined = undefined;
    records: any[] = [];

    async onLoad() {
        this.addListener("Plugin.MapLikes.onSync", this.onSync, this);
        const widget = new Widget(MapLikesComponent, "mapLikesWidget");
        if (tmc.game.Name === "TmForever") {
            widget.pos = { x: 121, y: 60, z: 1 };
        } else {
            widget.pos = { x: 121, y: 60, z: 1 };
        }

        widget.size = { width: 38, height: 4 };
        widget.actions["like"] = tmc.ui.addAction(this.actionLike.bind(this), 1);
        //  widget.actions["dislike"] = tmc.ui.addAction(this.actionLike.bind(this), -1);
        this.widget = widget;
    }

    async actionLike(login: string, value: number) {
        const plugin = tmc.getPlugin("maplikes");
        const vote = plugin.votes.find((v) => v.login === login);
        if (!vote) {
            await plugin.updateVote(login, 1);
            return;
        }
        if (vote && vote.vote <= 0) plugin.updateVote(login, 1);
        else if (vote && vote.vote > 0) plugin.updateVote(login, 0);
    }

    async onUnload() {
        this.widget?.destroy();
        this.widget = undefined;
    }

    async onSync(data: Like[]) {
        await this.updateWidget(data);
    }

    async updateWidget(data: Like[]) {
        if (this.widget) {
            let positive = 0;
            let negative = 0;
            let total = 0.0001;

            for (const like of data) {
                if (like.vote > 0) {
                    positive++;
                } else {
                    negative++;
                }
                total++;
            }

            let percentage = `${((positive / total) * 100).toFixed(0) || 0}%`;

            this.widget.setData({
                percentage: percentage,
                positive: positive,
                negative: negative,
                width: ((positive / total) * (this.widget.size.width - 12)).toFixed(0),
            });

            await this.widget.display();
        }
    }
}
