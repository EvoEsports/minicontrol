import MapsWindow from "./mapsWindow";
import MapsWindowAdmin from "./mapsWindowAdmin";
import Plugin from "..";
import Menu from "@core/menu";
import { Op, QueryTypes, type Sequelize } from "sequelize";
import PersonalBest from "@core/schemas/personalBest.model";
import { clone, formatTime, htmlEntities, removeColors } from "@core/utils";

export default class Maps extends Plugin {
    async onLoad() {
       this.addCommand("/list", this.cmdMaps.bind(this), "Display maps list");
       this.addCommand("//list", this.cmdAdmMaps.bind(this), "Display maps list");

        Menu.getInstance().addItem({
            category: "Map",
            title: "Map List",
            action: "/list",
        });

        Menu.getInstance().addItem({
            category: "Map",
            title: "Manage Maps",
            action: "//list",
            admin: true,
        });
    }

    async onUnload() {
        tmc.removeCommand("/list");
    }

    /**
     *  Player command to display the map list
     * @param login
     * @param params
     */
    async cmdMaps(login: any, params: string[]) {
        let rankings: any[] = [];
        let outParams: string[] = params;
        let maps = clone(tmc.maps.getMaplist() || []);
        const sequelize: Sequelize = tmc.storage["db"];
        let title = "Server Maps";
        const uids = tmc.maps.getUids() || [];
        if (sequelize && Object.keys(tmc.plugins).includes("records")) {
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
                outParams = [];
            }
        }

        const window = new MapsWindow(login, outParams);
        window.pos.y = 0;
        window.title = title;
        window.size = { width: 190, height: 120 };
        window.setColumns([
            { key: "Index", title: "#", width: 4 },
            { key: "Name", title: "Name", width: 50, action: "Queue" },
            { key: "AuthorName", title: "Author", width: 30 },
            { key: "ATime", title: "Author Time", width: 20 },
            { key: "Environnement", title: "Environment", width: 15 },
            { key: "Rank", title: "My Rank", width: 10 },
            { key: "Karma", title: "Karma", width: 10 },
            { key: "Date", title: "Date Added", width: 20 },
        ]);
        window.sortColumn = "Name";
        const actions: string[] = [];
        const plugins = Object.keys(tmc.plugins);

        if (plugins.includes("jukebox")) {
            actions.push("Queue");
        }

        if (plugins.includes("records")) {
            actions.push("Records");
        }

        if (tmc.admins.includes(login)) {
            actions.push("Remove");
            window.size.width += 15;
        }

        let i = 1;
        const outMaps: any[] = [];

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
                        Name: htmlEntities(map.Name.trim()),
                        AuthorName: htmlEntities(map.AuthorNickname || map.Author || ""),
                        ATime: formatTime(map.AuthorTime || map.GoldTime),
                        Vehicle: map.Vehicle ? htmlEntities(map.Vehicle) : "",
                        Rank: myRank,
                        Karma: outKarma,
                        Date: map.CreatedAt || "",
                    }),
                );
            }
        }
        title += ` [${outMaps.length}]`;
        window.setItems(outMaps);
        window.setActions(actions);
        window.display();
    }

    /**
     * Admin command to display the map list
     * @param login
     * @param params
     */
    async cmdAdmMaps(login: any, params: string[]) {
        const window = new MapsWindowAdmin(login, params);
        window.size = { width: 155, height: 120 };
        window.setColumns([
            { key: "Index", title: "#", width: 4 },
            { key: "Name", title: "Name", width: 50, action: "Queue" },
            { key: "AuthorName", title: "Author", width: 30 },
            { key: "Environnement", title: "Environment", width: 15 },
            { key: "ATime", title: "Author Time", width: 20 },
        ]);
        window.title = `Maps [${tmc.maps.getMapCount()}]`;
        window.setActions(["Remove"]);
        window.display();
    }
}
