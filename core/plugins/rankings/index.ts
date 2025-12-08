import Plugin from "@core/plugins";
import type { Sequelize } from "sequelize-typescript";
import { QueryTypes } from "sequelize";
import ListWindow from "@core/ui/listwindow";
import Player from "@core/schemas/players.model";
import Menu from "@core/menu";

interface Ranking {
    rank: number;
    login: string;
    avg: number;
}

export default class Players extends Plugin {
    rankings: Ranking[] = [];

    async onLoad() {
        this.addListener("Trackmania.EndMap", this.onEndMap, this);
        this.addCommand("/top100", this.cmdRankings.bind(this), "Show top ranks");
        this.addCommand("/topranks", this.cmdRankings.bind(this), "Show top ranks");
        this.addCommand("/rank", this.cmdMyRank.bind(this), "Show my rank");
        this.onEndMap(null);

        Menu.getInstance().addItem({
            category: "Records",
            title: "Top Rankings",
            action: "/topranks",
        });
        Menu.getInstance().addItem({
            category: "Records",
            title: "My Rank",
            action: "/rank",
        });
    }

    async onUnload() { }


    async onEndMap(_data: any) {
        const sequelize: Sequelize = tmc.storage["db"];
        const mapUids = tmc.maps.getUids();
        const mapCount = mapUids.length;
        const maxRank = tmc.settings.get("records.maxRecords") || 100;
        const rankedRecordCount = 3;
        console.time("rankings");
        tmc.debug(`¤info¤Fetching rankings for $fff${mapCount} ¤info¤maps`);

        sequelize
            .query(
                `SELECT row_number() OVER (order by average) as rank, login, average as avg FROM (
            SELECT
                login,
                (1.0 * (SUM(player_rank) + (? - COUNT(player_rank)) * ?) / ? * 10000) AS average,
                COUNT(player_rank) AS ranked_records_count
                FROM
                (
                    SELECT
                        mapUuid,
                        login,
                        time,
                        RANK() OVER (PARTITION BY mapUuid ORDER BY time ASC) AS player_rank
                    FROM scores WHERE mapUuid in (?)
                ) AS ranked_records
                WHERE player_rank <= ?
                GROUP BY login
            ) grouped_ranks
            WHERE ranked_records_count >= ? order by average asc
            `,
                {
                    type: QueryTypes.SELECT,
                    raw: true,
                    replacements: [mapCount, maxRank, mapCount, mapUids, maxRank, rankedRecordCount],
                },
            )
            .then((result: any) => {
                this.rankings = result as Ranking[];
                tmc.debug(`¤info¤Rankings fetched: $fff${this.rankings.length}`);
                console.timeEnd("rankings");
            })
            .catch((err: any) => {
                tmc.cli(`¤error¤Error while fetching rankings: ${err}`);
                this.rankings = [];
            });
    }

    async cmdMyRank(login: string, _args: string[]) {
        const rank = this.rankings.find((val) => val.login === login);
        if (rank) {
            const avg = (rank.avg / 10000).toFixed(2);
            tmc.chat(`Your server rank is ${rank.rank}/${this.rankings.length} with average ${avg}`, login);
        } else {
            tmc.chat("No rankings found.", login);
        }
    }

    async cmdRankings(login: string, _args: string[]) {
        const window = new ListWindow(login);
        const players = await Player.findAll();
        const outRanks: any = [];
        let x = 0;
        for (const rank of this.rankings) {
            if (x > 100) break;
            const avg = rank.avg / 10000;
            const player = players.find((val) => val.login === rank.login);
            outRanks.push({
                rank: rank.rank,
                nickname: player?.customNick ?? player?.nickname ?? "Unknown",
                avg: avg.toFixed(2),
            });
            x += 1;
        }

        window.setItems(outRanks);
        window.setColumns([
            { key: "rank", title: "Rank", width: 20 },
            { key: "nickname", title: "Name", width: 60 },
            { key: "avg", title: "Average", width: 20 },
        ]);
        window.display();
    }
}
