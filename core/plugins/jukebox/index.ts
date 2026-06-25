import Plugin from "@core/plugins";
import QueueWindow from "./queueWIndow";
import Menu from "@core/menu";
import { type Map as TmMap } from "@core/mapmanager";
import log from "@core/log";

export interface JbMap {
    UId: string;
    File: string;
    Name: string;
    Author: string;
    AuthorTime: number;
    Environment: string;
    QueueBy: string;
    QueueNickName: string;
}

declare module "@core/plugins" {
    interface PluginRegistry {
        "jukebox": Jukebox;
    }
}
export default class Jukebox extends Plugin {
    queue: JbMap[] = [];
    history: string[] = [];
    historySize = 2;

    private applyHistorySize(value: number) {
        const normalized = Number(value);
        this.historySize = Number.isFinite(normalized) ? Math.max(0, Math.floor(normalized)) : 0;
        if (this.historySize === 0) {
            this.history = [];
        }
    }

    async onLoad() {
        this.addCommand("/addqueue", this.cmdQueue.bind(this), "Add Map to queue");
        this.addCommand("/jb", this.cmdListQueue.bind(this), "List maps in queue");
        this.addCommand("/jukebox", this.cmdListQueue.bind(this), "List maps in queue");
        this.addCommand("/drop", this.cmdDrop.bind(this), "Drop Map from queue");
        this.addCommand("//cjb", this.cmdClearQueue.bind(this), "clear queue");
        this.addCommand("//requeue", this.cmdRequeue.bind(this), "Add current map to the front of the queue");
        this.addCommand("//prev", this.cmdPrev.bind(this), "Skip to previous map");

        this.addSetting("jukebox.enabled", true, null, "Jukebox: Enable/Disable jukebox");
        this.addSetting(
            "jukebox.history_size",
            2,
            async (value: number) => {
                this.applyHistorySize(value);
            },
            "Jukebox: Number of maps to keep in history",
        );
        this.applyHistorySize(tmc.settings.get("jukebox.history_size"));

        if (tmc.game.Name === "TmForever") {
            this.addListener("Trackmania.EndMap", this.onEndRace, this);
        } else {
            this.addListener("Trackmania.EndMatch", this.onEndRace, this);
        }
    }

    async onUnload() {

    }

    async onStart() {
        const menu = Menu.getInstance();
        menu.addItem({
            category: "Map",
            title: "Jukebox",
            action: "/jb",
        });

        menu.addItem({
            category: "Map",
            title: "Replay Map again",
            action: "//requeue",
            admin: true,
        });

        menu.addItem({
            category: "Map",
            title: "Previous Map",
            action: "//prev",
            admin: true,
        });
    }

    async addToJukebox(login: string, map: TmMap) {
        const player = await tmc.getPlayer(login);
        this.queue.push({
            UId: map.UId,
            File: map.FileName,
            Name: map.Name,
            Author: map.AuthorNickname || map.Author,
            AuthorTime: map.AuthorTime,
            Environment: map.Environnement,
            QueueBy: login,
            QueueNickName: player.customNick || player.nickname,
        });
    }

    async removeFromJukebox(mapUid: string) {
        const index = this.queue.findIndex((m) => m.UId === mapUid);
        if (index > -1) {
            this.queue.splice(index, 1);
            return;
        }
        throw new Error("Map not found.");
    }


    async cmdQueue(login: any, params: string[]) {
        let map: any = null;
        if (!tmc.settings.get("jukebox.enabled")) {
            tmc.chat("¤info¤Map queue is disabled", login);
            return;
        }
        if (params.length === 0) {
            tmc.chat("¤info¤Usage: /addqueue < map index or map uid >", login);
            return;
        }
        if (params[0].toString().length < 5) {
            const index = Number.parseInt(params[0]) - 1;
            map = tmc.maps.getMaplist()[index];
        } else {
            map = tmc.maps.getMaplist().find((m: any) => m.UId === params[0]);
        }
        if (!map) {
            tmc.chat("¤info¤map not found", login);
            return;
        }
        const player = await tmc.players.getPlayer(login);
        const previous = this.queue.find((m) => m.QueueBy === login);
        if (previous && !tmc.admins.includes(login)) {
            tmc.chat("¤info¤You already have a map in queue", login);
            return;
        }
        if (this.queue.find((m) => m.UId === map.UId)) {
            tmc.chat("¤info¤Map already in queue", login);
            return;
        }
        if (!tmc.admins.includes(login)) {
            const isRecent = this.historySize > 0 && this.history.includes(map.UId);
            const isCurrent = tmc.maps.currentMap && tmc.maps.currentMap.UId === map.UId;
            if (isRecent) {
                tmc.chat("¤info¤Map was recently played", login);
                return;
            }
            if (this.historySize > 0 && isCurrent) {
                tmc.chat("¤info¤Map is currently being played", login);
                return;
            }
        }
        this.addToJukebox(login, map);
        tmc.chat(`¤info¤Map ¤white¤${map.Name} ¤info¤added to the queue by ¤white¤${player.nickname}`);
    }

    async cmdDrop(login: any, args: string[]) {
        let index: number;
        let map: JbMap | undefined;
        if (tmc.admins.includes(login) && args.length > 0) {
            index = Number.parseInt(args[0], 10) - 1;
            map = this.queue[index];
        } else {
            map = this.queue.find((m) => m.QueueBy === login);
            index = this.queue.findIndex((m) => m === map);
            if (index === -1) {
                tmc.chat(`¤info¤You don't have any map in queue`, login);
                return;
            }
        }

        if (map) {
            this.removeFromJukebox(map.UId);
            tmc.server.emit("Jukebox.MapRemoved", map.UId);
            tmc.chat(`¤info¤Map ¤white¤${map.Name} ¤info¤dropped from the queue by ¤white¤${map.QueueNickName}`);
        } else {
            tmc.chat(`¤info¤You don't have any map in queue`, login);
        }
    }

    async cmdClearQueue(_login: any, _args: string[]) {
        this.queue = [];
        tmc.chat("¤info¤Map queue cleared");
    }

    async cmdRequeue(login: any, _args: string[]) {
        const map = tmc.maps.currentMap;
        const player = await tmc.players.getPlayer(login);

        if (map) {
            if (this.queue[0]?.UId === map.UId) return tmc.chat("¤info¤Map already in queue", login);

            this.queue.unshift({
                UId: map.UId,
                File: map.FileName,
                Name: map.Name,
                Author: map.AuthorNickname || map.Author,
                AuthorTime: map.AuthorTime,
                Environment: map.Environnement,
                QueueBy: login,
                QueueNickName: player.nickname,
            });
            tmc.chat(`¤info¤Map ¤white¤${map.Name} ¤info¤requeued by ¤white¤${player.nickname}`);
        } else {
            tmc.chat("¤info¤Could not requeue map", login);
        }
    }

    async cmdPrev(login: any, _args: string[]) {
        const map = tmc.maps.previousMap;
        const player = await tmc.players.getPlayer(login);

        if (!map) return tmc.chat("¤error¤No previous map", login);
        if (map.UId === tmc.maps.currentMap?.UId) return tmc.chat("¤error¤Previous map is the same as the current map", login);

        this.queue.unshift({
            UId: map.UId,
            File: map.FileName,
            Name: map.Name,
            Author: map.AuthorNickname || map.Author,
            AuthorTime: map.AuthorTime,
            Environment: map.Environnement,
            QueueBy: login,
            QueueNickName: player.nickname,
        });

        await tmc.server.call("NextMap");
    }

    async onEndRace(_data: any) {
        if (this.historySize > 0 && tmc.maps.currentMap) {
            this.history.push(tmc.maps.currentMap.UId);
            if (this.history.length > this.historySize) {
                this.history.shift();
            }
        } else if (this.historySize === 0 && this.history.length > 0) {
            this.history = [];
        }
        const removedMaps = this.queue.filter((map) => !tmc.players.getAllLogins().includes(map.QueueBy));
        for (const map of removedMaps) {
            tmc.chat(`¤info¤Map ¤white¤${map.Name} ¤info¤removed from the queue. Player ¤white¤${map.QueueNickName} ¤info¤has left the server.`);
            tmc.server.emit("Jukebox.MapRemoved", map.UId);
        }

        this.queue = this.queue.filter((map) => tmc.players.getAllLogins().includes(map.QueueBy));

        if (this.queue.length > 0) {
            const map = this.queue.shift();
            if (map) {
                try {
                    await tmc.server.call("ChooseNextMap", map.File);
                    tmc.server.emit("Jukebox.NextMap", map.UId);
                    tmc.chat(`¤info¤Next map ¤white¤${map.Name} ¤info¤jukeboxed by ¤white¤${map.QueueNickName}`);
                } catch (e: any) {
                    log.error(e.message);
                }
            }
        }
    }

    async cmdListQueue(login: any, _args: string[]) {
        const window = new QueueWindow(login);
        window.display();
    }
}
