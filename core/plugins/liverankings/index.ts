import Plugin from "@core/plugins";
import type { Player } from "@core/playermanager";
import { clone } from "@core/utils";

interface LiveRecord {
    login: string;
    time: number;
    player: Player | null;
    checkpoints?: string;
    rank?: number;
}

declare module "@core/plugins" {
    interface PluginRegistry {
        "liverankings": Liverankings;
    }
}
export default class Liverankings extends Plugin {
    liverankings: LiveRecord[] = [];
    private playerCheckpoints: { [login: string]: string[] } = {};

    async onLoad() {
        this.addListener("Trackmania.BeginMap", this.onBeginMap, this);
        this.addListener("TMC.PlayerFinish", this.onPlayerFinish, this);
        this.addListener("TMC.PlayerCheckpoint", this.onPlayerCheckpoint, this);
    }

    async onBeginMap(data: any) {
        const map = data[0];

        this.liverankings = [];
        this.playerCheckpoints = {};
        tmc.server.emit("Plugin.LiveRankings.onSync", {
            records: clone(this.liverankings),
        });
    }

    async onPlayerCheckpoint(data: any) {
        const login = data[0];
        const raceTime = data[1];
        const checkpointIndex = data[2];

        if (!this.playerCheckpoints[login] || checkpointIndex === 0) {
            this.playerCheckpoints[login] = [];
        }

        this.playerCheckpoints[login].push(raceTime.toString());
        const nbCp = tmc.maps.currentMap?.NbCheckpoints || 1;

        if (checkpointIndex % nbCp === nbCp) {
            this.playerCheckpoints[login].push(";");
        } else {
            this.playerCheckpoints[login].push(",");
        }
    }

    async onPlayerFinish(data: any) {
        const login = data[0];
        const finishTime = data[1];
        try {
            if (!this.playerCheckpoints[login]) {
                this.playerCheckpoints[login] = [];
            }

            this.playerCheckpoints[login].push(data[1].toString());

            const player = await tmc.getPlayer(login);
            const newLiveRecord: LiveRecord = {
                login,
                time: finishTime,
                player,
                checkpoints: this.playerCheckpoints[login].join(""),
            };
            const existingLiveRecordIndex = this.liverankings.findIndex((record) => record.login === login);

            if (existingLiveRecordIndex === -1) {
                this.liverankings.push({ ...newLiveRecord });
            } else {
                const existingLiveRecord = this.liverankings[existingLiveRecordIndex];
                if (newLiveRecord.time < existingLiveRecord.time) {
                    existingLiveRecord.time = newLiveRecord.time;
                    existingLiveRecord.checkpoints = this.playerCheckpoints[login].join("");
                }
            }

            this.liverankings.sort((a, b) => a.time - b.time);

            this.liverankings.forEach((record, index) => {
                record.rank = index + 1;
            });

            tmc.server.emit("Plugin.LiveRankings.onSync", {
                records: this.liverankings,
            });
        } catch (e: any) {
            tmc.cli(e);
        }
    }
}
