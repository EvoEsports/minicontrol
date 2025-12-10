import { clone, htmlEntities, formatTime } from "@core/utils";
import Plugin from "..";
import QueueWindow from "./queueWIndow";
import Menu from "@core/menu";

export interface Map {
    UId: string;
    File: string;
    Name: string;
    Author: string;
    AuthorTime: number;
    Environment: string;
    QueueBy: string;
    QueueNickName: string;
}

export default class Jukebox extends Plugin {
    queue: Map[] = [];
    history: string[] = [];
    historySize = 2;

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
            async (value) => {
                this.historySize = value;
            },
            "Jukebox: Number of maps to keep in history",
        );
        this.historySize = tmc.settings.get("jukebox.history_size");

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
        if (this.history.includes(map.UId) || (tmc.maps.currentMap && tmc.maps.currentMap.UId === map.UId)) {
            tmc.chat("¤info¤Map was recently played", login);
            return;
        }
        this.queue.push({
            UId: map.UId,
            File: map.FileName,
            Name: map.Name,
            Author: map.AuthorNickname || map.Author,
            AuthorTime: map.AuthorTime,
            Environment: map.Environnement,
            QueueBy: login,
            QueueNickName: player.nickname,
        });
        tmc.chat(`¤info¤Map ¤white¤${map.Name} ¤info¤added to the queue by ¤white¤${player.nickname}`);
    }

    async cmdDrop(login: any, args: string[]) {
        let index: number;
        let map: any;
        if (tmc.admins.includes(login) && args.length > 0) {
            index = Number.parseInt(args[0]) - 1;
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
            this.queue.splice(index, 1);
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
        if (tmc.maps.currentMap) {
            this.history.push(tmc.maps.currentMap.UId);
            if (this.history.length > this.historySize) {
                this.history.shift();
            }
        }
        if (this.queue.length > 0) {
            const map = this.queue.shift();
            if (map) {
                if (!tmc.players.getAllLogins().includes(map.QueueBy)) {
                    tmc.chat(`¤info¤Player ¤white¤${map.QueueNickName}$z$s ¤info¤is no longer online, ignoring their jukeboxed map.`);
                    return;
                }
                try {
                    await tmc.server.call("ChooseNextMap", map.File);
                    tmc.chat(`¤info¤Next map ¤white¤${map.Name} ¤info¤jukeboxed by ¤white¤${map.QueueNickName}`);
                } catch (e: any) {
                    tmc.cli(`¤error¤${e.message}`);
                }
            }
        }
    }

    async cmdListQueue(login: any, _args: string[]) {
        const window = new QueueWindow(login);
        const maps: any = [];
        let i = 1;
        for (const map of clone(this.queue)) {
            maps.push(
                Object.assign(map, {
                    Index: i++,
                    Name: htmlEntities(map.Name),
                    Author: htmlEntities(map.Author),
                    AuthorTime: formatTime(map.AuthorTime),
                    QueueNickName: htmlEntities(map.QueueNickName),
                }),
            );
        }
        window.title = `Map Queue [${maps.length}]`;
        window.size = { width: 205, height: 95 };
        window.setItems(maps);
        window.setColumns([
            { key: "Index", title: "#", width: 4 },
            { key: "Name", title: "Name", width: 50 },
            { key: "Author", title: "Author", width: 30 },
            { key: "Environment", title: "Environment", width: 25 },
            { key: "QueueNickName", title: "Wish by", width: 50 },
        ]);

        window.setActions(["Drop"]);
        window.display();
    }
}
