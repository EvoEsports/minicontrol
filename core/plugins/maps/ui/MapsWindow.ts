import PersonalBest from "@core/plugins/records/models/personalBest.model";
import ListWindow from "@core/ui2/listwindow";
import { clone, removeColors } from "@core/utils";
import { Op, QueryTypes, type Sequelize } from "sequelize";

export default class MapsWindow extends ListWindow {
    size = { width: 190, height: 120 };
    params: string[] = [];

    constructor(login: string, type: string, params: string[] = []) {
        super(login, type);
        this.params = params;
        this.setItemsPerPage(20);
        this.setColumns({
            Index: { title: "#", width: 10, align: "center" },
            Name: { title: "Name", width: 50, actionKey: "queue" },
            AuthorName: { title: "Author", width: 30 },
            ATime: { title: "Author Time", width: 20, type: "time", align: "center" },
            Environnement: { title: "Environment", width: 15 },
            Rank: { title: "My Rank", width: 10, align: "center" },
            Karma: { title: "Karma", width: 10, align: "center" },
            Date: { title: "Date Added", width: 20, align: "center" },
        });
        this.datatable.sortColumn = "Name";

        if (tmc.existsPlugin("jukebox")) {
            this.setAction("queue", "Queue", async (login: string, map: any) => {
                await this.hide();
                await tmc.getPlugin("jukebox").cmdQueue(login, [map.UId]);
            })
        }

        if (tmc.existsPlugin("records")) {
            this.setAction("records", "Recs", async (login: string, map: any) => {
                await this.hide();
                tmc.getPlugin("records").cmdRecords(login, [map.UId]);
            });
        }

        if (tmc.admins.includes(login)) {
            this.setAction("remove", "Remove", async (login: string, map: any) => {
                await tmc.chatCmd.execute(login, `//remove ${map.UId}`);
            });
            this.size.width += 15;
        }

    }

    async update() {
        const params = this.params;
        const login = this.recipient;
        let title = "Maps on server";

        let i = 1;
        const outMaps: any[] = [];
        let maps = clone(tmc.maps.getMaplist() || []);
        let rankings: any[] = [];
        const uids = tmc.maps.getUids() || [];
        if (tmc.existsPlugin("records")) {
            const sequelize: Sequelize = tmc.getPlugin("database").sequelize;
            rankings = await sequelize.query(
                `SELECT * FROM (
                SELECT mapUuid as Uid, login, time, RANK() OVER (PARTITION BY mapUuid ORDER BY time ASC) AS playerRank
                FROM scores WHERE mapUuid in (?)
                ) AS t WHERE login = ?`,
                {
                    type: QueryTypes.SELECT,
                    raw: true,
                    replacements: [uids, login],
                },
            );

            if (params[0] === "nofinish" || params[0] === "finished") {
                const fins =
                    (await PersonalBest.findAll({
                        where: {
                            login: login,
                            mapUuid: {
                                [Op.in]: uids,
                            },
                        },
                    })) || [];
                const filter = fins.map((val) => {
                    return val.mapUuid;
                });

                if (["nofin", "nofinish"].includes(params[0])) {
                    maps = maps.filter((map) => {
                        return !filter.includes(map.UId);
                    });
                    title = "Not Finished Maps";
                }
                if (["fin", "finished"].includes(params[0])) {
                    maps = maps.filter((map) => {
                        return filter.includes(map.UId);
                    });
                    title = "Finished Maps";
                }
            }
        }

        for (const map of maps) {
            if (
                !params[0] ||
                removeColors(map.Name).toLocaleLowerCase().indexOf(params[0].toLocaleLowerCase()) !== -1 ||
                removeColors(map.AuthorNickname || map.Author || "")
                    .toLocaleLowerCase()
                    .indexOf(params[0].toLocaleLowerCase()) !== -1 ||
                removeColors(map.Environnement).toLocaleLowerCase().indexOf(params[0].toLocaleLowerCase()) !== -1
            ) {
                const karma = Number.parseFloat((map.Karma?.total ?? -1000).toFixed(2));
                let outKarma = "";
                if (karma === 0) {
                    outKarma = "$fff0%";
                } else if (karma > 0) {
                    outKarma = `$0f0${karma}%`;
                } else if (karma < 0) {
                    outKarma = `$f00${karma}%`;
                }
                if (karma === -1000.0) {
                    outKarma = "-";
                }

                const rank =
                    rankings.find((val) => {
                        return map.UId === val.Uid;
                    })?.playerRank || -1;
                const max = tmc.settings.get("records.maxRecords") || 100;
                let myRank = rank > max ? "-" : rank;
                if (myRank === -1) {
                    myRank = "-";
                }

                outMaps.push(
                    Object.assign(map, {
                        Index: i++,
                        Name: map.Name.trim(),
                        AuthorName: map.AuthorNickname || map.Author || "",
                        ATime: map.AuthorTime || map.GoldTime,
                        Vehicle: map.Vehicle ? map.Vehicle : "",
                        Rank: myRank,
                        Karma: outKarma,
                        Date: map.CreatedAt || "",
                    }),
                );
            }
        }

        this.title = `${title} [${outMaps.length}]`;
        this.setItems(outMaps);
    }

}
