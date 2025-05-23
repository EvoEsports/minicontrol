import ListWindow from "@core/ui/listwindow";
import { GBX, type CGameCtnChallenge } from "gbx";
import { existsSync, promises as fspromises } from "node:fs";
import { htmlEntities } from "@core/utils";

export default class LocalMapsWindow extends ListWindow {
    async onPageItemsUpdate(items: any) {
        for (const item of items) {
            if (existsSync(item.File) && item.File.match(/[.](Map|Challenge)[.]Gbx/gi)) {
                const stream = await fspromises.readFile(item.File);
                const gbx = new GBX<CGameCtnChallenge>(stream, 0);
                try {
                    await gbx.parseHeaders().then((file) => {
                        item.MapAuthor = file.mapInfo.author || "";
                        if (tmc.game.Name === "Trackmania") {
                            item.MapAuthor = htmlEntities(file.authorNickname || "");
                        }
                        let name = file.mapName || "";
                        if (name.startsWith("ï»¿")) {
                            name = Buffer.from(name.replace("ï»¿", ""), "latin1").toString("utf-8");
                        }
                        item.MapName = htmlEntities(name);
                    });
                } catch (e: any) {
                    tmc.cli(`¤error¤${e.message}`);
                }
            }
        }
    }

    async onAction(login: string, action: string, item: any) {
        if (action === "Add") {
            await tmc.chatCmd.execute(login, `//addlocal "${item.File}"`);
        }
    }
}
