import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { createEnvironment, createFilesystemLoader, type TwingTemplate } from "twing";


export interface MlSize {
    width: number;
    height: number;
}

export interface MlPos {
    x: number;
    y: number;
    z: number;
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
    loader = createFilesystemLoader(fs);
    environment = createEnvironment(this.loader, { charset: "utf-8", parserOptions: { level: 3 } });

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

            // If path-like (contains a separator) treat as relative to cwd
            if (tpl.includes("/") || tpl.includes("\\")) {
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

            // Deduplicate and try candidates
            let lastErr: any = null;
            const tried = new Set<string>();
            for (const candidate of candidates) {
                if (!candidate || tried.has(candidate)) continue;
                tried.add(candidate);
                try {
                    if (!fs.existsSync(candidate)) continue;
                    this.loader.addPath(path.dirname(candidate), "");
                    this._templateData = await this.environment.loadTemplate(candidate, "utf-8");
                    return this._templateData.render(this.environment, obj);
                } catch (e: any) {
                    lastErr = e;
                    // try next candidate
                }
            }

            // As a last resort, try loading the template name directly (some loader setups accept logical names)
            try {
                this._templateData = await this.environment.loadTemplate(tpl, "utf-8");
                return this._templateData.render(this.environment, obj);
            } catch (e: any) {
                if (!lastErr) lastErr = e;
            }

            // Nothing loaded
            tmc.cli(`Manialink error: ¤error¤ Failed to load template ${tpl} — tried ${[...tried].join(', ')}`);
            throw new Error(`Failed to load template ${tpl}` + (lastErr ? `: ${lastErr.message}` : ""));
        } else {
            try {
                return (await this._templateData?.render(this.environment, obj)) ?? "";
            } catch (e: any) {
                tmc.cli(`Manialink error: ¤error¤ ${e.message}`);
                throw new Error(`Failed to render template: ${e.message}`);
            }
        }
    }
}
