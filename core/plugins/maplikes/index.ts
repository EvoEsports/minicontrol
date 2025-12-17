import Plugin from "@core/plugins";
import Likes from "@core/schemas/maplikes.model";
import { QueryTypes, type Sequelize } from "sequelize";

export interface Like {
    login: string;
    vote: number;
    updatedAt: string;
}

declare module "@core/plugins" {
    interface PluginRegistry {
        "maplikes": MapLikes;
    }
}

export default class MapLikes extends Plugin {

    votes: Like[] = [];

    async onLoad() {
        tmc.database.addModels([Likes]);
        this.addCommand('/++', this.onLike.bind(this), 'Like a map');
        this.addCommand('/--', this.onDislike.bind(this), 'Dislike a map');
        this.addListener("Trackmania.BeginMap", this.syncVotes, this);
        this.addListener("Trackmania.PlayerChat", this.onPlayerChat, this);
    }

    async onStart() {
        await this.syncVotes();
    }

    async onUnload() {
    }

    async syncVotes() {
        if (!tmc.maps.currentMap) return;
        const votes = await Likes.findAll({ where: { mapUuid: tmc.maps.currentMap.UId } });
        this.votes = [];
        for (const vote of votes) {
            this.votes.push({ login: vote.login || "", vote: vote.vote || 0, updatedAt: vote.updatedAt || "" });
        }
        const sequelize: Sequelize | undefined = tmc.database.sequelize;
        const uids = tmc.maps.getUids();
        tmc.debug(`¤info¤Starting karma sync for $fff${uids.length} ¤info¤maps`);
        console.time("karma sync");
        sequelize?.query(
            `SELECT *, (positive/(positive+abs(negative)+0.00001))*100 as total from (
                            SELECT mapUuid as Uid, createdAt,
                            SUM(case when vote>0 then vote else 0 end) as positive,
                            SUM(case when vote<0 then vote else 0 end) as negative,
                            SUM(ABS(vote)) as total FROM maplikes
                            WHERE mapUuid in (?)
                            GROUP BY mapUuid) as t`,
            {
                type: QueryTypes.SELECT,
                raw: true,
                replacements: [uids],
            },
        )
            .then((result: any) => {
                tmc.debug("¤info¤Sync complete.");
                console.timeEnd("karma sync");
                for (const info of result) {
                    const map = tmc.maps.getMap(info.Uid);
                    if (map) {
                        map.Karma = {
                            positive: info.positive,
                            negative: info.negative,
                            total: info.total,
                        };
                    }
                }
            })
            .catch((err: any) => {
                tmc.cli(`¤error¤Error while syncing karma: ${err.message}`);
            });

        tmc.server.emit("Plugin.MapLikes.onSync", this.votes);
    }

    async onPlayerChat(data: any) {
        if (data[0] === 0) return;
        if (data[2].startsWith("/")) return;
        const login = data[1];
        const text = data[2];

        if (text === "++" || text === "+++") {
            await this.updateVote(login, 1);
        }

        if (text === "--" || text === "---") {
            await this.updateVote(login, -1);
        }
    }

    async onLike(login: string) {
        await this.updateVote(login, 1);
    }

    async onDislike(login: string) {
        await this.updateVote(login, -1);
    }

    async updateVote(login: string, value = 0) {
        if (!tmc.maps.currentMap) return;
        let mapLike = await Likes.findOne({
            where: {
                mapUuid: tmc.maps.currentMap.UId,
                login: login,
            },
        });
        if (!mapLike) {
            mapLike = await Likes.create({
                mapUuid: tmc.maps.currentMap.UId,
                login: login,
                vote: value,
            });
        }
        await mapLike.update({ vote: value });
        await this.syncVotes();
    }
}
