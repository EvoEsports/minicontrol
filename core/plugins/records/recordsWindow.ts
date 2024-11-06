import ListWindow from "@core/ui/listwindow";
import Confirm from "@core/ui/confirm";
import Score from "@core/schemas/scores.model";
import Player from "@core/schemas/players.model";
import { formatTime } from '@core/utils';
import { Op } from "sequelize";
import WorldRecords from "@core/plugins/worldrecords";
import Records from "@core/plugins/records";
import LiveRecords from "@core/plugins/liveRecords";

interface Column {
    title: string;
    key: string;
    width: number;
}

type AppType = Records | LiveRecords | WorldRecords;

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
            }
            else if (this.title.includes("Server Records")) {
                const confirm = new Confirm(login, `Delete record from ${item.nickname} $z$s(no undo)`, this.applyCommand.bind(this), [login, item]);
                await confirm.display();
            }
        }
        else if (action === "View") {
            let recordDetails;
            if (this.title.includes("Live Records")) {
                recordDetails = await this.getRecordDetails(item.login);
            }
            else if (this.title.includes("Server Records")) {
                recordDetails = await this.getRecordDetails(item.login);
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

    async getRecordDetails(login: string) {
        if (this.title.includes('Server Records'))
        {
            try {
                const record = await Score.findOne({
                    where: { login: login, mapUuid: (this.app as Records).currentMapUid },
                    order: [['time', 'ASC'], ['updatedAt', 'ASC']], // just in case there are multiple entries for the same player on that map for whatever reason
                    include: [Player],
                });

                if (record) {
                    const betterRecordsCount = await Score.count({
                        where: {
                            mapUuid: (this.app as Records).currentMapUid,
                            [Op.or]: [
                                {
                                    time: { [Op.lt]: record.time }
                                },
                                {
                                    time: record.time,
                                    updatedAt: { [Op.lt]: record.updatedAt }
                                }
                            ]
                        }
                    });
                    const rank = betterRecordsCount + 1;
                    return {
                        rank: rank,
                        nickname: record.player?.nickname || record.login,
                        time: record.time,
                        checkpoints: record.checkpoints
                    };
                }

                else {
                    return null;
                }
            }
            catch (error) {
                console.error(`Error fetching server record details for ${login}:`, error);
                return null;
            }
        }
        else if (this.title.includes("Live Records")) {
            try {
                const liveRecord = (this.app as LiveRecords).liveRecords.find(record => record.login === login);

                if (!liveRecord) {
                    return null;
                }

                return {
                    rank: (this.app as LiveRecords).liveRecords.indexOf(liveRecord) + 1,
                    nickname: liveRecord.player?.nickname || liveRecord.login,
                    time: liveRecord.time,
                    checkpoints: liveRecord.checkpoints
                };
            }
            catch (error) {
                console.error(`Error fetching live record details for ${login}:`, error);
                return null;
            }
        }
        else {
            return null;
        }
    }
}

class DetailsWindow extends ListWindow {
    record: any;

    constructor(login: string, record: any) {
        super(login);
        this.record = record;
        this.title = `Record Details for ${this.record?.nickname || 'Unknown'}`;
    }

    async display() {
        if (!this.record) {
            return;
        }

        const items: { key: string, value: string }[] = [
            { key: "Rank", value: `${this.record.rank}` },
            { key: "Nickname", value: this.record.nickname },
            { key: "Time", value: formatTime(this.record.time).replace("0:", "") },
        ];

        if (this.record.checkpoints) {
            if (typeof this.record.checkpoints === 'string') {
                items.push({ key: "", value: "" });
                const laps = this.record.checkpoints.split(';');
                let lastLapTotalTime = 0;

                laps.forEach((lap: string, lapIndex: number) => {
                    const lapCheckpoints = lap.split(',');
                    items.push({ key: `Lap ${lapIndex + 1}`, value: "" });

                    lapCheckpoints.forEach((cpTimeStr: string, index: number) => {
                        const cpTime = parseInt(cpTimeStr);

                        if (!isNaN(cpTime)) {
                            const lapTime = cpTime - lastLapTotalTime;
                            lastLapTotalTime = cpTime;

                            const checkpointKey = index === lapCheckpoints.length - 1 ? "Finish" : `Checkpoint ${index + 1}`;

                            if (lapIndex > 0) {
                                items.push({ key: checkpointKey, value: `${formatTime(lapTime).replace("0:", "")} (${formatTime(cpTime).replace("0:", "")})` });
                            }
                            else {
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
            { key: "value", title: "Data", width: 50 }
        ]);

        await super.display();
    }
    setColumns(columns: Column[]): void {
        this.data['columns'] = columns;
    }
}
