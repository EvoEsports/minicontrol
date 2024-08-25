import ListWindow from '../../ui/listwindow';
import { GBX, CGameCtnChallenge } from "gbx";
import path from "path";
import { existsSync, promises as fspromises } from "fs";
import { escape } from '../../utils';

export default class LocalMapsWindow extends ListWindow {

    async onPageItemsUpdate(items: any) {
        for (const item of items) {
            console.log(item);
            if (existsSync(item.File) && item.File.match(/[.](Map|Challenge)[.]Gbx/gi)) {
                const stream = await fspromises.readFile(item.File);
                const gbx = new GBX<CGameCtnChallenge>(stream, 0);
                try {
                    await gbx.parseHeaders().then
                        (
                            file => {
                                item.MapAuthor = file.mapInfo.author || "";
                                if (tmc.game.Name == "Trackmania") {
                                    item.MapAuthor = escape(file.authorNickname || "");
                                }
                                item.MapName = escape(file.mapName?.toWellFormed() || "");
                            }
                        );
                } catch (e: any) {
                    tmc.cli("¤error¤" + e.message);
                }
            }
        }
    }

    async onAction(login: string, action: string, item: any) {
        if (action == "Add") {
            await tmc.chatCmd.execute(login, `//addlocal "${item.Name}"`);
        }
    }
}