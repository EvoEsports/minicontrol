import ListWindow from "@core/ui/listwindow";
import Confirm from "@core/ui/confirm";
import Score from "@core/plugins/records/models/scores.model";
import Player from "@core/plugins/database/models/players.model";
import { formatTime, htmlEntities } from "@core/utils";
import { Op } from "sequelize";

export default class RecordsWindow extends ListWindow {
    size = { width: 100, height: 120 };
    mapUuid: string;

    constructor(login: string, mapUuid: string) {
        super(login, "recordsWindow");
        this.mapUuid = mapUuid;

        this.setColumns({
            rank: { title: "Rank", width: 10, align: "center" },
            nickname: { title: "Nickname", width: 50 },
            time: { title: "Time", width: 20, align: "center", type: "time" },
        });

        this.setAction("View", "View", async (login: string, item: any) => {
            const recordDetails = await this.getRecordDetails(item.login, item.mapUuid);
            if (recordDetails) {
                const detailsWindow = new DetailsWindow(login, recordDetails);
                await detailsWindow.display();
            }
        });

        if (tmc.admins.includes(login)) {
            this.size.width = 115;
            this.setAction("Delete", "Delete", async (login: string, item: any) => {
                const confirm = new Confirm(login, `Delete record from ${item.nickname} $z$s(no undo)`, this.applyCommand.bind(this), [login, item]);
                await confirm.display();
            });
        }
    }

    async updateRecords() {
        const plugin = tmc.getPlugin("records");
        const data = await plugin.getRecords(this.mapUuid);
        this.data.records = [];

        for (const record of data) {
            this.data.records.push({
                rank: record.rank,
                nickname: htmlEntities(record?.player?.customNick ?? record?.player?.nickname ?? ""),
                login: record.login,
                time: formatTime(record.time ?? 0),
                mapUuid: this.mapUuid,
            });
        }
        const map = tmc.maps.getMap(this.mapUuid) ?? tmc.maps.currentMap;
        this.title = `Server Records for ${map.Name}$z$s [${this.data.records.length}]`;

    }

    async applyCommand(login: string, item: any) {
        const plugin = tmc.getPlugin("records");
        await plugin.deleteRecord(login, item);
        await this.updateRecords();
        this.display();
    }

    async getRecordDetails(login: string, mapUuid: string) {
        try {
            const record = await Score.findOne({
                where: { login: login, mapUuid: mapUuid },
                order: [
                    ["time", "ASC"],
                    ["updatedAt", "ASC"],
                ], // just in case there are multiple entries for the same player on that map for whatever reason
                include: [{ model: Player, as: 'player' }],
            });

            if (record) {
                const betterRecordsCount = await Score.count({
                    where: {
                        mapUuid: mapUuid,
                        [Op.or]: [
                            {
                                time: { [Op.lt]: record.time },
                            },
                            {
                                time: record.time,
                                updatedAt: { [Op.lt]: record.updatedAt },
                            },
                        ],
                    },
                });
                const rank = betterRecordsCount + 1;
                return {
                    rank: rank,
                    nickname: record.player?.nickname || record.login,
                    time: record.time,
                    checkpoints: record.checkpoints,
                };
            }
            return null;
        } catch (error) {
            console.error(`Error fetching server record details for ${login}:`, error);
            return null;
        }
    }
}


class DetailsWindow extends ListWindow {
    record: any;

    constructor(login: string, record: any) {
        super(login);
        this.size = { width: 160, height: 95 };
        this.record = record;
        this.title = `Record Details for ${htmlEntities(this.record?.nickname || "Unknown")}`;
    }

    async display() {
        if (!this.record) {
            return;
        }

        const items: { key: string; value: string }[] = [
            { key: "Rank", value: `${this.record.rank}` },
            { key: "Nickname", value: htmlEntities(this.record.nickname) },
            { key: "Time", value: formatTime(this.record.time).replace("0:", "") },
        ];

        if (this.record.checkpoints) {
            if (typeof this.record.checkpoints === "string") {
                items.push({ key: "", value: "" });
                const laps = this.record.checkpoints.split(";");
                let lastLapTotalTime = 0;

                laps.forEach((lap: string, lapIndex: number) => {
                    const lapCheckpoints = lap.split(",");
                    items.push({ key: `Lap ${lapIndex + 1}`, value: "" });

                    lapCheckpoints.forEach((cpTimeStr: string, index: number) => {
                        const cpTime = Number.parseInt(cpTimeStr);

                        if (!Number.isNaN(cpTime)) {
                            const lapTime = cpTime - lastLapTotalTime;
                            lastLapTotalTime = cpTime;

                            const checkpointKey = index === lapCheckpoints.length - 1 ? "Finish" : `Checkpoint ${index + 1}`;

                            if (lapIndex > 0) {
                                items.push({
                                    key: checkpointKey,
                                    value: `${formatTime(lapTime).replace("0:", "")} (${formatTime(cpTime).replace("0:", "")})`,
                                });
                            } else {
                                items.push({ key: checkpointKey, value: `${formatTime(lapTime).replace("0:", "")}` });
                            }
                        }
                    });
                });
            }
        }
        this.setItems(items);
        this.setColumns({
            key: { title: "Stats", width: 50 },
            value: { title: "Data", width: 50 },
        });
        await super.display();
    }

}
