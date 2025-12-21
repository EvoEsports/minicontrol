import * as fs from "node:fs";
import * as path from "node:path";
import { createEnvironment, createFilesystemLoader, type TwingTemplate } from "twing";
import type IManialink from "@core/ui2/interfaces/imanialink";

export interface MlSize {
    width: number;
    height: number;
}

export interface MlPos {
    x: number;
    y: number;
    z: number;
}

export interface objMap {
    id: string;
    layer: string;
    size: MlSize;
    pos: MlPos;
    actions: { [key: string]: string };
    colors: { [key: string]: string };
    data: { [key: string]: any };
    title: string;
    game: string;
    recipient: string | undefined;
}

export default class Manialink implements IManialink {
    id: string = tmc.ui.uuid();
    size: MlSize = { width: 160, height: 95 };
    pos: MlPos = { x: 0, y: 10, z: 1 };
    template = "core/templates/manialink.xml.twig";
    layer: "normal" | "ScoresTable" | "ScreenIn3d" | "altmenu" | "cutscene" = "normal";
    actions: { [key: string]: string } = {};
    data: { [key: string]: any } = {};
    recipient: string | undefined = undefined;
    title = "";
    displayDuration = 0;
    canHide = true;

    private _templateData: TwingTemplate | undefined = undefined;
    private _firstDisplay = true;
    protected baseDir: string | undefined = undefined; // optional base directory (e.g. plugin can pass import.meta.dirname) to resolve bare templates

    constructor(login: string | undefined = undefined, baseDir?: string) {
        this.recipient = login;
        this.baseDir = baseDir;

    }

    async display() {
        if (this._firstDisplay) {
            this._firstDisplay = false;
            tmc.ui.displayManialink(this);
        } else {
            tmc.ui.refreshManialink(this);
        }
    }


    async hide() {
        tmc.ui.hideManialink(this);
    }

    cleanReferences() {
        //const template = this.title || this.template || this.id;
        //tmc.debug('Cleaning references for manialink: $fff' + template);
        this._templateData = undefined;
        for (const key of Object.keys(this)) {
            try { this[key] = undefined; } catch { }
        }

        if (gc) gc();
    }

    async destroy(hide = true) {
        // Ask UI manager to remove references and hide/destroy
        tmc.ui.destroyManialink(this, hide);
        // Clear per-instance caches so this object can be released promptly
    }

    /**
    * render manialink template
    * @returns
    */
    async render(): Promise<string> {

        const obj = {
            id: this.id,
            layer: this.layer,
            size: this.size,
            pos: this.pos,
            actions: this.actions,
            colors: tmc.settings.colors,
            data: this.data,
            title: this.title,
            game: tmc.game.Name,
            recipient: this.recipient,
        };
        const loader = createFilesystemLoader(fs);
        loader.addPath(path.resolve(process.cwd()), "");
        loader.addPath(path.dirname(path.resolve(process.cwd(), this.template)), "");
        loader.addPath(path.resolve(this.baseDir || ""), "");
        const environment = createEnvironment(loader, { charset: "utf-8", parserOptions: { level: 3 } });

        if (!this._templateData) {
            try {
                const data = await environment.loadTemplate(path.basename(this.template));
                const result = await data.render(environment, obj);
                return result;

            } catch (e: any) {
                console.log(e);
            }
            // Nothing loaded
            tmc.cli(`Manialink error: ¤error¤ Could not find manialink template: ${this.template}`);
            throw new Error(`Could not find manialink template: ${this.template}`);
        } else {
            try {
                const result = await this._templateData.render(environment, obj);
                return result;
            } catch (e: any) {
                if (e.previous) {
                    tmc.cli(`Manialink error: ¤error¤ ${e.previous}`);
                    throw new Error(`Failed to render template: ${e.previous}`);
                } else {
                    tmc.cli(`Manialink error: ¤error¤ ${e.message}`);
                    throw new Error(`Failed to render template: ${e.message}`);
                }

            }
        }
    }

}
