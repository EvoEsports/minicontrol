import ListWindow from "@core/ui/listwindow";
import Confirm from "@core/ui/confirm";
import Score from "@core/plugins/records/models/scores.model";
import Player from "@core/plugins/database/models/players.model";
import { formatTime, htmlEntities } from "@core/utils";
import { Op } from "sequelize";
import type WorldRecords from "@core/plugins/worldrecords";
import type Records from "@core/plugins/records";
import type liverankings from "@core/plugins/liverankings";

interface Column {
    title: string;
    key: string;
    width: number;
}

type AppType = Records | liverankings | WorldRecords;

export default class RecordsWindow extends ListWindow {
    app: AppType;

    constructor(login: string, app: AppType) {
        super(login);
        this.app = app;
    }

    async onAction(login: string, action: string, item: any): Promise<void> {
        if (action === "Delete") {
            if (this.title.includes("Live Records")) {
                const confirm = new Confirm(login, `Delete record from ${item.nickname} $z$s(no undo)`, this.applyCommand.bind(this), [login, item]);
                await confirm.display();
            } else if (this.title.includes("Server Records")) {
                const confirm = new Confirm(login, `Delete record from ${item.nickname} $z$s(no undo)`, this.applyCommand.bind(this), [login, item]);
                await confirm.display();
            }
        } else if (action === "View") {
            let recordDetails: any;
            if (this.title.includes("Live Records")) {
                recordDetails = await this.getRecordDetails(item.login, item.mapUuid);
            } else if (this.title.includes("Server Records")) {
                recordDetails = await this.getRecordDetails(item.login, item.mapUuid);
            }

            if (recordDetails) {
                const detailsWindow = new DetailsWindow(login, recordDetails);
                await detailsWindow.display();
            }
        }
    }

    async applyCommand(login: string, item: any) {
        await this.app.deleteRecord(login, item);
    }

    async getRecordDetails(login: string, mapUuid: string) {
        if (this.title.includes("Server Records")) {
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
        } else if (this.title.includes("Live Records")) {
            try {
                const liveRecord = (this.app as liverankings).liverankings.find((record) => record.login === login);

                if (!liveRecord) {
                    return null;
                }

                return {
                    rank: (this.app as liverankings).liverankings.indexOf(liveRecord) + 1,
                    nickname: liveRecord.player?.nickname || liveRecord.login,
                    time: liveRecord.time,
                    checkpoints: liveRecord.checkpoints,
                };
            } catch (error) {
                console.error(`Error fetching live record details for ${login}:`, error);
                return null;
            }
        } else {
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
        this.setColumns([
            { key: "key", title: "Stats", width: 50 },
            { key: "value", title: "Data", width: 50 },
        ]);

        await super.display();
    }
    setColumns(columns: Column[]): void {
        this.data["columns"] = columns;
    }
}
