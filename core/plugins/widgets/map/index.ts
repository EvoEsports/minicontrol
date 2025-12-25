import { htmlEntities, formatTime } from "@core/utils";
import Plugin from "@core/plugins";
import Widget from "@core/ui2/widget";
import MapWidgetComponent from "./MapWidget.tsx";
import type { TmxMapInfo } from "@core/plugins/tmx";

export default class MapWidget extends Plugin {
    widget!: Widget;
    tmxInfo: TmxMapInfo = {} as TmxMapInfo;

    async onLoad() {
        this.widget = new Widget(MapWidgetComponent, "tmxMapInfoWidget");
        this.widget.pos = { x: 121, y: 89, z: 1 };
        this.widget.size = { width: 38, height: 9 };
        this.widget.setOpenAction(this.buttonClick.bind(this));
        this.addListener("Trackmania.BeginMap", this.onBeginMap, this);
        this.addListener("Plugin.TMX.MapInfo", this.onMapInfo, this);
        await this.display();
    }

    async onBeginMap(data: any) {
        await this.display();
    }

    async onMapInfo(data: any) {
        this.tmxInfo = data[0];
        await this.display();
    }

    getTmxLogo() {
        switch (tmc.game.Name) {
            case "TmForever":
                return {
                    url: "http://images.mania.exchange/logos/tm1x/long.png",
                    size: "10 5",
                };
            case "ManiaPlanet":
                return {
                    url: "http://images.mania.exchange/logos/mx/long_sm.png",
                    size: "22 4",
                };
            case "Trackmania":
                return {
                    url: "http://images.mania.exchange/logos/tmx/long_sm.png",
                    size: "22 4",
                };
        }
        return {
            url: "http://images.mania.exchange/logos/mx/long_w_sm.png",
            size: "22 4",
        };
    }

    async display() {
        const data = this.tmxInfo;
        const map = tmc.maps.currentMap;

        let tmxUrl = "";
        if (data.TmxId) {
            tmxUrl = `${data.TmxUrl}mapshow/${data.TmxId}`;
            if (data.TmxId && tmc.game.Name === "TmForever") {
                tmxUrl = `${data.TmxUrl.replace("https://", "http://")}trackshow/${data.TmxId}`;
            }
        }
        const tags = (data.Tags || []).splice(0, 3);

        let info = "No TMX Info";
        if (data.Style) {
            info = data.Style ?? "";
            for (const tag of tags) {
                if (tag !== data.Style) {
                    info += `, ${tag}$fff`;
                }
            }
        }

        this.widget.setData({
            author: map.AuthorNickname ? map.AuthorNickname : map.Author,
            mapname: map.Name,
            authortime: formatTime(map.AuthorTime),
            wrTime: formatTime(data.wrTime || 0),
            wrHolder: data.wrHolder || "n/a",
            tmx: this.getTmxLogo(),
            tmxUrl: tmxUrl,
            game: tmc.game.Name,
            info: info,
            difficulty: data.Difficulty || "Normal",
        });

        this.widget?.display();
    }

    async buttonClick(login: string, _data: any) {
        await tmc.chatCmd.execute(login, "/list");
    }
}
