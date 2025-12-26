import ListWindow from "@core/ui/listwindow";
import { GBX, type CGameCtnChallenge } from "gbx";
import { existsSync, promises as fspromises } from "node:fs";
import fs from "node:fs";
import fsPath from "node:path";

export default class LocalMapsWindow extends ListWindow {
    size = { width: 180, height: 120 };

    constructor(login: string) {
        super(login);
        const out: any = [];
        for (const file of fs.readdirSync(tmc.mapsPath, { withFileTypes: true, recursive: true, encoding: "utf8" })) {
            if (file.name.toLowerCase().endsWith(".gbx")) {
                const name = file.name.replaceAll(/[.](Map|Challenge)[.]Gbx/gi, "");
                const filename = fsPath.resolve(tmc.mapsPath, file.parentPath, file.name);
                const path = file.parentPath.replace(tmc.mapsPath, "");
                out.push({
                    File: filename,
                    FileName: name,
                    Path: path,
                    MapName: "",
                    MapAuthor: "",
                    processed: false
                });
            }
        }

        this.title = `Add Local Maps [${out.length}]`;
        this.setItems(out);
        this.setColumns({
            Path: { title: "Path", width: 40 },
            FileName: { title: "Map File", width: 30, actionKey: "Add" },
            MapName: { title: "Name", width: 50, actionKey: "Add" },
            MapAuthor: { title: "Author", width: 35 },
        });

        this.setAction("Add", null, async (login: string, item: any) => {
            try {
                await tmc.server.call("AddMap", item.File);
                tmc.chat(`¤info¤Map added: ${item.MapName || item.FileName}`, login);
            } catch (e: any) {
                tmc.chat(`¤error¤${e.message}`, login);
            }
        });
    }

    async onPageItemsUpdate(items: any) {
        for (const item of items) {
            if (item.processed) continue;
            item.processed = true;
            if (existsSync(item.File) && item.File.match(/[.](Map|Challenge)[.]Gbx/gi)) {
                const stream = await fspromises.readFile(item.File);
                const gbx = new GBX<CGameCtnChallenge>(stream, 0);
                try {
                    await gbx.parseHeaders().then((file) => {
                        item.MapAuthor = file.mapInfo.author || "";
                        if (tmc.game.Name === "Trackmania") {
                            item.MapAuthor = file.authorNickname || "";
                        }
                        let name = file.mapName || "";
                        if (name.startsWith("ï»¿")) {
                            name = Buffer.from(name.replace("ï»¿", ""), "latin1").toString("utf-8");
                        }
                        item.MapName = name;
                    });
                } catch (e: any) {
                    tmc.cli(`¤error¤${e.message}`);
                }
            }
        }
        return items;
    }

}
