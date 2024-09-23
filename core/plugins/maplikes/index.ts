import { Sequelize } from "sequelize-typescript";
import Plugin from "@core/plugins";
import Likes from "@core/schemas/maplikes.model";

export interface Like {
    login: string;
    vote: number;
    updatedAt: string;
}

export default class MapLikes extends Plugin {
    static depends: string[] = ["database"];
    votes: Like[] = [];

    async onLoad() {
        tmc.storage['db'].addModels([Likes]);
        tmc.addCommand("/++", this.onLike.bind(this), "Like a map");
        tmc.addCommand("/--", this.onDislike.bind(this), "Dislike a map");
        tmc.server.addListener("Trackmania.BeginMap", this.syncVotes, this);
        tmc.server.addListener("Trackmania.PlayerChat", this.onPlayerChat, this);
    }

    async onStart() {
        await this.syncVotes();
    }

    async onUnload() {
        tmc.removeCommand("/++");
        tmc.removeCommand("/--");
        tmc.server.removeListener("Trackmania.BeginMap", this.syncVotes);
        tmc.server.removeListener("Trackmania.PlayerChat", this.onPlayerChat);
        this.votes = [];
    }

    async syncVotes() {
        if (!tmc.maps.currentMap) return;
        const votes = await Likes.findAll({ where: { mapUuid: tmc.maps.currentMap.UId } });
        this.votes = [];
        for (const vote of votes) {
            this.votes.push({ login: vote.login, vote: vote.vote, updatedAt: vote.updatedAt || "" });
        }
        tmc.server.emit("Plugin.MapLikes.onSync", this.votes);
    }

    async onPlayerChat(data: any) {
        if (data[0] == 0) return;
        if (data[2].startsWith("/")) return;
        const login = data[1];
        const text = data[2];

        if (text === "++") {
            await this.updateVote(login, 1);
        }

        if (text === "--") {
            await this.updateVote(login, -1);
        }
    }

    async onLike(login: string) {
        await this.updateVote(login, 1);
    }

    async onDislike(login: string) {
        await this.updateVote(login, -1);
    }

    async updateVote(login: string, value: number = 0) {
        if (!tmc.maps.currentMap) return;
        let mapLike = await Likes.findOne(
            {
                where: {
                    mapUuid: tmc.maps.currentMap.UId,
                    login: login,
                }
            });
        if (!mapLike) {
            mapLike = await Likes.create({
                mapUuid: tmc.maps.currentMap.UId,
                login: login,
                vote: value
            })
        }
        await mapLike.update({ vote: value });
        await this.syncVotes();
    }

}