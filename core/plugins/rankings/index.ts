import Plugin from "@core/plugins";
import { QueryTypes } from "sequelize";
import ListWindow from "@core/ui2/listwindow";
import Player from "@core/plugins/database/models/players.model";
import Menu from "@core/menu";
import console from "node:console";

interface Ranking {
    rank: number;
    login: string;
    avg: number;
}

declare module "@core/plugins" {
    interface PluginRegistry {
        "rankings": Rankings;
    }
}

export default class Rankings extends Plugin {
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

        const mapUids = tmc.maps.getUids();
        const mapCount = mapUids.length;
        const maxRank = tmc.settings.get("records.maxRecords") || 100;
        const rankedRecordCount = 3;
        console.time("rankings");
        tmc.debug(`¤info¤Fetching rankings for $fff${mapCount} ¤info¤maps`);
        tmc.getPlugin("database").sequelize.query(
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
        const maxRank = tmc.settings.get("records.maxRecords") || 100;
        for (const rank of this.rankings) {
            if (x > maxRank) break;
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
        window.setColumns({
            rank: { title: "Rank", width: 20 },
            nickname: { title: "Name", width: 60 },
            avg: { title: "Average", width: 20 },
        });
        window.display();
    }
}
