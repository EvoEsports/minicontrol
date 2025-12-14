import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { createEnvironment, createFilesystemLoader, type TwingTemplate } from "twing";
import { castType } from "@core/utils.js";

const tagsRe = /<(?<name>[A-Za-z_][\w:.-]*)\b(?<attrs>(?:\s+[^\s=\/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*?)\s*(?:\/>|>(?<inner>[\s\S]*?)<\/\k<name>\s*>)/g;
const attrRe = /([^\s=\/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
const tagStartRe = /<(?<name>[A-Za-z_][\w:.-]*)/g;

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
    // optional base directory (e.g. plugin can pass import.meta.dirname) to resolve bare templates
    private _baseDir: string | undefined = undefined;
    layer: "normal" | "ScoresTable" | "ScreenIn3d" | "altmenu" | "cutscene" = "normal";
    actions: { [key: string]: string } = {};
    data: { [key: string]: any } = {};
    recipient: string | undefined = undefined;
    title = "";
    displayDuration = 0;
    private _firstDisplay = true;
    canHide = true;
    _templateData: TwingTemplate | undefined = undefined;
    // Reuse shared loader + environment to avoid expensive allocations per instance
    private _sharedLoader = createFilesystemLoader(fs);
    private _sharedEnvironment = createEnvironment(this._sharedLoader, { charset: "utf-8", parserOptions: { level: 3 } });
    private _resolvedTemplates = new Map<string, string>();
    private _scripts = new Map<string, string>();

    constructor(login: string | undefined = undefined, baseDir?: string) {
        this.recipient = login;
        if (baseDir) this._baseDir = baseDir;
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

        for (const key of Object.keys(this)) {
            delete this[key];
        }
    }

    async destroy(hide = true) {
        tmc.ui.destroyManialink(this, hide);
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

        if (!this._templateData) {
            // Try to resolve template using a few heuristics:
            // - leading slash ("/...") -> treat as project-root-relative (process.cwd())
            // - template contains a path separator -> treat as project-root-relative
            // - bare filename (no separators) -> attempt to locate caller's directory (plugin-local template)
            const candidates: string[] = [];

            const tpl = this.template || "";

            // If path-like (contains a separator or is absolute path) treat as relative to cwd
            if (path.isAbsolute(tpl) || tpl.includes("/") || tpl.includes("\\")) {
                candidates.push(path.resolve(process.cwd(), tpl));
            }

            // If bare-name (no separators) use provided baseDir if available, otherwise fall back to stack-based discovery
            if (!tpl.includes("/") && !tpl.includes("\\")) {
                if (this._baseDir) {
                    candidates.push(path.resolve(this._baseDir, tpl));
                } else {
                    const orig = Error.prepareStackTrace;
                    Error.prepareStackTrace = (_, stack) => stack;
                    const { stack } = new Error();
                    Error.prepareStackTrace = orig;
                    for (const frame of stack ?? []) {
                        const callerFile = (frame as any).getFileName();

                        // Normalize file-like URLs and malformed file: strings into proper filesystem paths
                        let caller: string | null = null;
                        if (callerFile) {
                            let resolved = callerFile as string;
                            if (resolved.startsWith("file:")) {
                                resolved = fileURLToPath(resolved);
                            }
                            caller = path.resolve(resolved);
                        } else {
                            caller = null;
                        }

                        if (caller && caller.indexOf("plugins") !== -1) {
                            const callerDir = path.resolve(path.dirname(caller));
                            if (candidates.indexOf(path.resolve(callerDir, tpl)) !== -1) continue;
                            candidates.push(path.resolve(callerDir, tpl));
                            break;
                        }
                    }
                    // Always add project-root fallback (this helps for plugin templates that already used full names like 'core/...')
                    candidates.push(path.resolve(process.cwd(), tpl));
                }
            }


            // Deduplicate and try candidates.
            // If we already resolved this template previously, use the cached absolute path.
            const cacheKey = `${this._baseDir ?? ''}|${tpl}`;
            const cached = this._resolvedTemplates.get(cacheKey);
            if (cached) {
                if (fs.existsSync(cached)) {
                    this._sharedLoader.addPath(path.dirname(cached), "");
                    try {
                        this._templateData = await this._sharedEnvironment.loadTemplate(cached, "utf-8");
                        const result = await this._templateData.render(this._sharedEnvironment, obj);
                        return await this.transform(result, obj);
                    } catch (e: any) {
                        // fall through to re-resolve below
                    }
                } else {
                    // Cached as logical name (not a file path), try to load it via shared environment
                    try {
                        this._templateData = await this._sharedEnvironment.loadTemplate(cached, "utf-8");
                        const result = await this._templateData.render(this._sharedEnvironment, obj);
                        return await this.transform(result, obj);
                    } catch (e: any) {
                        // fall through to re-resolve below
                    }
                }
            }
            let lastErr: any = null;
            const tried = new Set<string>();
            for (const candidate of candidates) {
                if (!candidate || tried.has(candidate)) continue;
                tried.add(candidate);
                try {
                    if (!fs.existsSync(candidate)) continue;
                    // register candidate directory to shared loader and load template
                    this._sharedLoader.addPath(path.dirname(candidate), "");
                    this._templateData = await this._sharedEnvironment.loadTemplate(candidate, "utf-8");
                    // Cache resolved template path to avoid future stack traces
                    this._resolvedTemplates.set(cacheKey, candidate);
                    const result = await this._templateData.render(this._sharedEnvironment, obj);
                    return await this.transform(result, obj);
                } catch (e: any) {
                    lastErr = e;
                    // try next candidate
                }
            }

            // As a last resort, try loading the template name directly (some loader setups accept logical names)
            try {
                this._templateData = await this._sharedEnvironment.loadTemplate(tpl, "utf-8");
                this._sharedLoader.addPath(path.resolve(process.cwd()), "");
                // Cache logical template reference so further lookups avoid stack scanning
                this._resolvedTemplates.set(cacheKey, tpl);
                const result = await this._templateData.render(this._sharedEnvironment, obj);
                return await this.transform(result, obj);
            } catch (e: any) {
                if (!lastErr) lastErr = e;
            }

            // Nothing loaded
            tmc.cli(`Manialink error: ¤error¤ Failed to load template ${tpl} — tried ${[...tried].join(', ')}`);
            throw new Error(`Failed to load template ${tpl}` + (lastErr ? `: ${lastErr.message}` : ""));
        } else {
            try {
                const result = await this._templateData?.render(this._sharedEnvironment, obj);
                const transformed = await this.transform(result, obj);
                return transformed;
            } catch (e: any) {
                tmc.cli(`Manialink error: ¤error¤ ${e.message}`);
                throw new Error(`Failed to render template: ${e.message}`);
            }
        }
    }

    private async transform(tpl: string, obj: objMap) {
        tagStartRe.lastIndex = 0;
        let match: RegExpExecArray | null = null;
        // Scan for registered component tags and process the template from the first
        // matching tag onward. After each replacement restart scanning so we don't
        // lose any prefix or skip tags introduced/shifted by processing.
        while ((match = tagStartRe.exec(tpl)) !== null) {
            const tagName = match.groups!.name;
            if (tmc.ui.getComponentTags().includes(tagName)) {
                const start = match.index!;
                const tail = tpl.slice(start);
                const processedTail = await this.process(tail, obj);
                tpl = tpl.slice(0, start) + processedTail;
                tagStartRe.lastIndex = 0;
            }
        }

        const header = `#Include "TextLib" as TextLib
	    #Include "MathLib" as MathLib
	    #Include "AnimLib" as AnimLib
	    #Include "ColorLib" as ColorLib
        `;

        let combinedScripts = "";
        const scriptTags = tpl.matchAll(/<script>([\s\S]*?)<\/script>/g);
        for (const scriptTag of scriptTags) {
            combinedScripts += `\n${scriptTag[1]}\n`;
        }
        for (const script of this._scripts.values()) {
            if (script && script.length > 0) {
                combinedScripts += `\n${script}\n`;
            }
        }
        const footer =
        //@language=ManiaScript
        `
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

        if (combinedScripts.length > 0) {
            tpl = tpl.replace("</manialink>", `<script><!--\n${header}${combinedScripts}${footer}\n--></script>\n</manialink>`);
        }



        return tpl;
    }

    private async process(tpl, obj) {

        const replacementTags = tpl.matchAll(tagsRe);
        for (const tag of replacementTags) {
            const { name, attrs, inner } = tag.groups as { name: string; attrs: string; inner: string };
            const tagName = name;
            const handler = tmc.ui.getComponentHandler(tagName);
            if (handler) {
                const attrMap: { [key: string]: any } = {};
                if (attrs) {
                    let match;
                    while ((match = attrRe.exec(attrs)) !== null) {
                        const attrName = match[1];
                        const attrValue = match[2] || match[3] || match[4] || "";
                        attrMap[attrName] = attrValue;
                    }
                }
                const { replacement, script } = await handler(attrMap, inner || "", obj);
                this._scripts.set(tagName, script || "");
                tpl = tpl.replace(tag[0], replacement);
            }
        }

        return tpl;
    }


}
