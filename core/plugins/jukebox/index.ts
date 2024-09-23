import { clone, escape, formatTime } from '@core/utils';
import Plugin from '..';
import QueueWindow from './queueWIndow';

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

    async onLoad() {
        tmc.addCommand("/addqueue", this.cmdQueue.bind(this), "Add Map to queue");
        tmc.addCommand("/jb", this.cmdListQueue.bind(this), "List maps in queue");
        tmc.addCommand("/jukebox", this.cmdListQueue.bind(this), "List maps in queue");
        tmc.addCommand("/drop", this.cmdDrop.bind(this), "Drop Map from queue");
        tmc.addCommand("//cjb", this.cmdClearQueue.bind(this), "clear queue");
        tmc.addCommand("//requeue", this.cmdRequeue.bind(this), "Add current map to the front of the queue");
        tmc.addCommand("//prev", this.cmdPrev.bind(this), "Skip to previous map");
        if (tmc.game.Name === "TmForever" || tmc.game.Name === "ManiaPlanet" ) {
            tmc.server.addListener("Trackmania.EndRace", this.onEndRace, this);
        } else {
            tmc.server.addListener("Trackmania.Podium_Start", this.onEndRace, this);
        }
    }

    async onUnload() {
        tmc.server.removeListener("Trackmania.EndMap", this.onEndRace);
        tmc.server.removeListener("Trackmania.Podium_Start", this.onEndRace);
        tmc.removeCommand("/addqueue");
        tmc.removeCommand("/jb");
        tmc.removeCommand("/jukebox");
        tmc.removeCommand("/drop");
        tmc.removeCommand("//cjb");
        tmc.removeCommand("//requeue");
        tmc.removeCommand("//prev");
        tmc.storage["menu"]?.removeItem("Show: Queue");
        tmc.storage["menu"]?.removeItem("Adm: Requeue");
        tmc.storage["menu"]?.removeItem("Adm: Prev");
    }

    async onStart() {
        if (tmc.storage["menu"]) {
            tmc.storage["menu"].addItem({
                category: "Map",
                title: "Show: Queue",
                action: "/jb"
            });

            tmc.storage["menu"].addItem({
                category: "Map",
                title: "Adm: Requeue",
                action: "//requeue",
                admin: true
            });

            tmc.storage["menu"].addItem({
                category: "Map",
                title: "Adm: Prev",
                action: "//prev",
                admin: true
            });
        }
    }

    async cmdQueue(login: any, params: string[]) {
        let map: any = null;
        if (process.env.DISABLE_MAP_QUEUE == "true") {
            tmc.chat("¤info¤Map queue is disabled", login);
            return;
        }
        if (params.length == 0) {
            tmc.chat(`¤info¤Usage: /addqueue < map index or map uid >`, login);
            return;
        }
        if (params[0].toString().length < 5) {
            let index = Number.parseInt(params[0]) - 1;
            map = tmc.maps.getMaplist()[index];
        } else {
            map = tmc.maps.getMaplist().find((m: any) => m.UId == params[0]);
        }
        if (!map) {
            tmc.chat("¤info¤map not found", login);
            return;
        }
        const player = await tmc.players.getPlayer(login);
        const previous = this.queue.find(m => m.QueueBy === login);
        if (previous && !tmc.admins.includes(login)) {
            tmc.chat("¤info¤You already have a map in queue", login);
            return;
        }
        if (this.queue.find(m => m.UId === map.UId)) {
            tmc.chat("¤info¤Map already in queue", login);
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
            QueueNickName: escape(player.nickname),
        });
        tmc.chat(`¤info¤Map ¤white¤${map.Name} ¤info¤added to the queue by ¤white¤${player.nickname}`);
    }

    async cmdDrop(login: any, args: string[]) {
        const player = await tmc.players.getPlayer(login);
        let index = 0;
        let map: any = null;
        if (tmc.admins.includes(login) && args.length > 0) {
            index = parseInt(args[0]) - 1;
            map = this.queue[index];
        } else {
            map = this.queue.find(m => m.QueueBy === login);
            index = this.queue.findIndex(m => m == map);
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

    async cmdClearQueue(login: any, args: string[]) {
        this.queue = [];
        tmc.chat("¤info¤Map queue cleared");
    }

    async cmdRequeue(login: any, args: string[]) {
        const map = tmc.maps.currentMap;
        const player = await tmc.players.getPlayer(login);

        if (map) {
            if (this.queue[0]?.UId == map.UId) return tmc.chat("¤info¤Map already in queue", login);

            this.queue.unshift({
                UId: map.UId,
                File: map.FileName,
                Name: map.Name,
                Author: map.AuthorNickname || map.Author,
                AuthorTime: map.AuthorTime,
                Environment: map.Environnement,
                QueueBy: login,
                QueueNickName: escape(player.nickname),
            });
            tmc.chat(`¤info¤Map ¤white¤${map.Name} ¤info¤requeued by ¤white¤${escape(player.nickname)}`);
        } else {
            tmc.chat(`¤info¤Could not requeue map`, login);
        }
    }

    async cmdPrev(login: any, args: string[]) {
        const map = tmc.maps.previousMap;
        const player = await tmc.players.getPlayer(login);

        if (!map) return tmc.chat("¤error¤No previous map", login);
        if (map.UId == tmc.maps.currentMap?.UId) return tmc.chat("¤error¤Previous map is the same as the current map", login);

        this.queue.unshift({
            UId: map.UId,
            File: map.FileName,
            Name: map.Name,
            Author: map.AuthorNickname || map.Author,
            AuthorTime: map.AuthorTime,
            Environment: map.Environnement,
            QueueBy: login,
            QueueNickName: escape(player.nickname),
        });

        await tmc.server.call("NextMap");
    }

    async onEndRace(data: any) {
        if (this.queue.length > 0) {
            const map = this.queue.shift();
            if (map) {
                try {
                await tmc.server.call("ChooseNextMap", map.File);
                tmc.chat(`¤info¤Next map ¤white¤${map.Name} ¤info¤jukeboxed by ¤white¤${map.QueueNickName}`);
                } catch (e:any) {
                    tmc.cli(`¤error¤${e.message}`);
                }
            }
        }
    }

     async cmdListQueue(login: any, args: string[]) {
        const window = new QueueWindow(login);
        const maps = [];
        let i = 1;
        for (const map of clone(this.queue)) {
            maps.push(
                Object.assign(map, {
                    Index: i++,
                    Name: escape(map.Name),
                    Author: escape(map.Author),
                    AuthorTime: formatTime(map.AuthorTime),
                })
            );
        }
        window.title = "Map Queue [" + maps.length + "]";
        window.size = { width: 205, height: 95 };
        window.setItems(maps);
        window.setColumns([
            { key: "Index", title: "#", width: 4 },
            { key: "Name", title: "Name", width: 50 },
            { key: "Author", title: "Author", width: 30 },
            { key: "Environment", title: "Environment", width: 25 },
            { key: "QueueNickName", title: "Wish by", width: 50 }
        ]);

        window.setActions(["Drop"]);
        await window.display()
    }

}