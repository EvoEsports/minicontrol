import Plugin from "core/plugins";
import type {BetterSQLite3Database} from "drizzle-orm/better-sqlite3";
import {and, eq} from "drizzle-orm";
import {MapLikes as Likes} from "core/schemas/maplikes";

export interface Like {
    login: string;
    vote: number;
    updatedAt: string;
}

export default class MapLikes extends Plugin {
    static depends: string[] = ["database"];
    votes: Like[] = [];

    async onLoad() {
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
        if (!tmc.storage['sqlite']) return;
        if (!tmc.maps.currentMap) return;
        const db: BetterSQLite3Database = tmc.storage['sqlite'];
        const votes = await db.select().from(Likes).where(eq(Likes.mapUuid, tmc.maps.currentMap.UId));
        this.votes = [];
        for (const vote of votes) {
            this.votes.push({login: vote.login, vote: vote.vote, updatedAt: vote.updatedAt || ""});
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
        if (!tmc.storage['sqlite']) return;
        if (!tmc.maps.currentMap) return;
        const db: BetterSQLite3Database = tmc.storage['sqlite'];
        const query = await db.select().from(Likes).where(and(eq(Likes.mapUuid, tmc.maps.currentMap.UId), eq(Likes.login, login)));
        if (query.length == 0) {
            await db.insert(Likes).values({
                mapUuid: tmc.maps.currentMap.UId,
                login: login,
                vote: value
            });
        } else {
            await db.update(Likes).set({
                vote: value,
                updatedAt: new Date().toISOString(),
            }).where(and(eq(Likes.mapUuid, tmc.maps.currentMap.UId), eq(Likes.login, login)));
        }
        await this.syncVotes();
    }

}