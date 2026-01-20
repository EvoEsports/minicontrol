import type IManialink from "./interfaces/imanialink";
import { JsxEngine, type FunctionalComponent } from "./forge";
import type { ManialinkModel } from "./interfaces/manialinkmodel";
import { RenderContext } from "./rendercontext";
import { SCRIPT_TEMPLATE } from "./scripttemplate";

export default class Manialink implements IManialink {
    public id: string = tmc.ui.uuid();
    public name: string = "";
    public layer: "normal" | "ScoresTable" | "ScreenIn3d" | "altmenu" | "cutscene" = "normal";
    public actions: { [key: string]: string } = {};
    public data: Record<string, any> = {};
    public recipient: string | undefined = undefined;
    public displayDuration = 0;
    public canHide = true;
    private scriptHeaders: Set<string> = new Set();
    public pos = { x: 0, y: 0, z: 0 };
    public size = { width: 160, height: 120 };

    protected _jsxComponent: FunctionalComponent;
    private _isFirstDisplay = true;

    constructor(jsxComponent: FunctionalComponent) {
        this._jsxComponent = jsxComponent;
    }

    async show() { await this.display(); }

    async hide() { tmc.ui.hideManialink(this); }

    async display() {
        if (this._isFirstDisplay) {
            this._isFirstDisplay = false;
            tmc.ui.displayManialink(this);
        } else {
            tmc.ui.refreshManialink(this);
        }
    }

    async destroy(hide = true) {
        tmc.ui.destroyManialink(this, hide);
        this.cleanReferences();
    }

    async render(): Promise<string> {
        const model: ManialinkModel = {
            id: this.id,
            layer: this.layer,
            actions: this.actions,
            colors: tmc.settings.colors,
            fonts: tmc.settings.fonts,
            data: this.data,
            game: tmc.game.Name,
            recipient: this.recipient,
            size: this.size,
            pos: this.pos
        };

        const ctx = new RenderContext(model);
        RenderContext.push(ctx);

        let xmlBody = "";
        try {
            const componentElement = this._jsxComponent({});
            xmlBody = JsxEngine.renderToString(componentElement);
        } finally {
            RenderContext.pop();
        }

        const headers = Array.from(this.scriptHeaders).concat(Array.from(ctx.headers)).join('\n');
        const scripts = Array.from(ctx.scripts).join('\n');

        let combinedScripts = "";
        if ((headers || scripts) && tmc.game.Name !== "TmForever") {
            combinedScripts = SCRIPT_TEMPLATE(headers, scripts);
        }

        return `<manialink version="3" id="${this.id}" layer="${this.layer}" name="${this.name}">
        ${xmlBody}
        ${combinedScripts}
        </manialink>`;
    }

    cleanReferences() {
        for (const key of Object.keys(this.actions)) {
            try { tmc.ui.removeAction(this.actions[key]); } catch (e) { console.error(e); }
        }
        this.actions = {};
        this.data = {};
    }

    addScriptHeader(header: string) {
        this.scriptHeaders.add(header);
    }

}
