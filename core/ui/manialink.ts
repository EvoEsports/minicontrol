import * as fs from "node:fs";
import * as path from "node:path";
import { createEnvironment, createFilesystemLoader, type TwingTemplate } from "twing";

const tagsRe = /<(?<name>[A-Za-z_][\w:.-]*)\b(?<attrs>(?:\s+[^\s=\/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*?)\s*\/>/gs;
const attrRe = /([^\s=\/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
const tagStartRe = /(?<name><[A-Za-z_][\w:.-]*.*?\>)(?<rest>.*)/s;
const scriptRe = /<script>([\s\S]*?)<\/script>/gs;

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

export default class Manialink {
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
    useComponents = false;

    private _templateData: TwingTemplate | undefined = undefined;
    private _firstDisplay = true;
    private _scripts = new Map<string, string>();
    private _scriptCache: string | null = null;
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
        try { this._scripts.clear(); } catch { }
        this._scriptCache = null;
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
        try { this._scripts.clear(); } catch { }
        this._templateData = undefined;
        this._scriptCache = null;
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
                this.checkForComponents(result);
                const transformed = this.useComponents ? await this.transform(result) : result;
                this._templateData = data;
                return transformed;
            } catch (e: any) {
                console.log(e);
            }
            // Nothing loaded
            tmc.cli(`Manialink error: ¤error¤ Could not find manialink template: ${this.template}`);
            throw new Error(`Could not find manialink template: ${this.template}`);
        } else {
            try {
                const result = await this._templateData.render(environment, obj);
                return this.useComponents ? await this.transform(result) : result;
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

    private checkForComponents(tpl:string) {
        if (this.useComponents) return; // already determined to use components

        const tags = tpl.matchAll(tagsRe);
        const componentTags: string[] = tmc.ui.getComponentTags();
        for (const tag of tags) {
            const { name } = tag.groups as { name: string; attrs: string; };
            if (componentTags.includes(name)) {
                this.useComponents = true;
                return;
            }
        }
        this.useComponents = false;
    }

    private async transform(tpl: string) {
        const re = tagStartRe.exec(tpl);
        if (!re || !re.groups) return tpl;
        const str = tpl.slice(re.index + (re.groups.name ?? "").length);
        tpl = re.groups.name + this.process(str);

        if (!this._scriptCache) {
            const header = `
                            #Include "TextLib" as TextLib
                            #Include "MathLib" as MathLib
                            #Include "AnimLib" as AnimLib
                            #Include "ColorLib" as ColorLib
            `;
            let combinedScripts = "";
            let customScripts = "";
            const scriptTags = tpl.matchAll(scriptRe);
            for (const scriptTag of scriptTags) {
                tpl = tpl.replace(scriptTag[0], ""); // remove script tag from tpl
                customScripts += `\n${scriptTag[1].replaceAll("<!--", "").replaceAll("-->", "")}\n`;
            }

            for (const script of this._scripts?.values() || []) {
                if (script && script.length > 0) {
                    combinedScripts += `\n${script}\n`;
                }
            }

            const footer = `
Void _nothing() {
}

main() {

    +++OnInit+++

    while(True) {
    yield;
    if (!PageIsVisible || InputPlayer == Null) {
            continue;
    }

    foreach (Event in PendingEvents) {
            switch (Event.Type) {
                case CMlScriptEvent::Type::EntrySubmit: {
                    +++EntrySubmit+++
                }
                case CMlScriptEvent::Type::KeyPress: {
                    +++OnKeyPress+++
                }
                case CMlScriptEvent::Type::MouseClick: {
                    +++OnMouseClick+++
                }
                case CMlScriptEvent::Type::MouseOut: {
                    +++OnMouseOut+++
                }
                case CMlScriptEvent::Type::MouseOver: {
                    +++OnMouseOver+++
                }
            }
        }

        +++Loop+++
    }

}
      `;
            // Only inject script block if there is any script content (pre-existing <script> tags or component scripts)
            if (combinedScripts.trim().length === 0) {
                // clear any collected scripts to free memory and return unchanged tpl
                this._scriptCache = `${header}${customScripts}${footer}`;
                this._scripts.clear();
                return tpl.replace("</manialink>", `<script><!--\n${this._scriptCache}\n--></script>\n</manialink>`);
            }

            this._scriptCache = `${header}${customScripts}${combinedScripts}${footer}`;
            this._scripts.clear();
            // clear collected scripts after injecting them to free memory
            return tpl.replace("</manialink>", `<script><!--\n${this._scriptCache}\n--></script>\n</manialink>`);
        }
        else {
            const scriptTags = tpl.matchAll(scriptRe);
            for (const scriptTag of scriptTags) {
                tpl = tpl.replace(scriptTag[0], ""); // remove script tag from tpl
            }
            return tpl.replace("</manialink>", `<script><!--\n${this._scriptCache}\n--></script>\n</manialink>`);
        }
    }

    private process(tpl: string) {
        const replacementTags = tpl.matchAll(tagsRe);
        const tagNames = tmc.ui.getComponentTags();

        for (const tag of replacementTags) {
            const { name, attrs } = tag.groups as { name: string; attrs: string; };
            if (!tagNames.includes(name)) { continue; }
            const handler = tmc.ui.getComponentHandler(name);
            if (handler) {
                const attrMap: { [key: string]: any } = {};
                if (attrs) {
                    let match;
                    attrRe.lastIndex = 0;
                    while ((match = attrRe.exec(attrs)) !== null) {
                        const attrName = match[1];
                        const attrValue = match[2] || match[3] || match[4] || "";
                        attrMap[attrName] = attrValue;
                    }
                }
                const { replacement, script } = handler(attrMap);

                // Always collect script fragments from components so they can be injected later
                if (!this._scriptCache) {
                    this._scripts.set(name, script || "");
                }
                tpl = tpl.replace(tag[0], replacement);
            }
        }

        return tpl;
    }


}
