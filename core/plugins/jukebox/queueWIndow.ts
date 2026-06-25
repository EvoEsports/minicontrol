import ListWindow from "@core/ui/listwindow";
import { clone } from "@core/utils";

export default class QueueWindow extends ListWindow {
    size = { width: 170, height: 120 };

    constructor(login: string) {
        super(login, "jukeboxWindow");

        this.setColumns({
            Index: { title: "#", width: 5, align: "center" },
            Name: { title: "Name", width: 50 },
            Author: { title: "Author", width: 30 },
            Environment: { title: "Environment", width: 25 },
            QueueNickName: { title: "Wish by", width: 50 },
        });
        this.update();

        this.setAction("drop", "Drop", async (login, item, entries) => {
            const plugin = tmc.getPlugin("jukebox");
            await plugin.cmdDrop(login, [item.Index.toString()]);
            this.update();
            this.display();
        });
    }

    update() {
        const plugin = tmc.getPlugin("jukebox");
        const maps: any = [];
        let i = 1;
        for (const map of clone(plugin.queue)) {
            maps.push(
                Object.assign(map, {
                    Index: i++,
                    Name: map.Name,
                    Author: map.Author,
                    AuthorTime: map.AuthorTime,
                    QueueNickName: map.QueueNickName,
                }),
            );
        }
        this.title = `Map Queue [${maps.length}]`;
        this.setItems(maps);
    }
}
