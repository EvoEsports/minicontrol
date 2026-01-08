import type IManialink from "./interfaces/imanialink";
import { renderJsx, roots, setHookIndex, setCurrentRoot, disposeScript, disposeRoot, trimHooks, getCurrentHookIndex, reverseArray, normalizeModels } from "./forge";
import type { ColorKey, FontKey } from "@core/settingsmanager";

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
    colors: ColorKey & Record<string, string>;
    fonts: FontKey & Record<string, string>;
    data: Record<string, any>;
    game: string;
    recipient: string | undefined;
}

// Static script template parts - created once at module load
const SCRIPT_HEADER = `<script><!--
        #Include "TextLib" as TextLib
        #Include "MathLib" as MathLib
        #Include "AnimLib" as AnimLib
        #Include "ColorLib" as ColorLib

        #Struct K_CustomScriptEvent {
            CMlScriptEvent::Type Type;
            CMlControl Control;
            Text ControlId;
            Integer KeyCode;
            Text KeyName;
            Text CharPressed;
        }

`;

const SCRIPT_FOOTER = `
        Void _nothing() {
        }

        main() {
            declare K_CustomScriptEvent Event;
            +++OnInit+++

            while(True) {
            yield;
            if (!PageIsVisible || InputPlayer == Null) {
                    continue;
            }

            {
                +++PreLoop+++
            }

            foreach (OrigEvent in PendingEvents) {
                   Event.Type = OrigEvent.Type;

                   if (OrigEvent.Type == CMlScriptEvent::Type::KeyPress) {
                       Event.KeyCode = OrigEvent.KeyCode;
                       Event.KeyName = OrigEvent.KeyName;
                       Event.CharPressed = OrigEvent.CharPressed;
                       Event.Control = Null;
                       Event.ControlId = "";
                   } else {
                        Event.KeyCode = 0;
                        Event.KeyName = "";
                        Event.CharPressed = "";
                        Event.Control = OrigEvent.Control;
                        Event.ControlId = OrigEvent.ControlId;
                   }

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
                        case CMlScriptEvent::Type::MouseRightClick: {
                            +++OnMouseRightClick+++
                        }
                        case CMlScriptEvent::Type::MouseOut: {
                            +++OnMouseOut+++
                        }
                        case CMlScriptEvent::Type::MouseOver: {
                            +++OnMouseOver+++
                        }
                    }
                }
                {
                    +++Loop+++
                }
            }
        }
        --></script>
 `;

function buildScriptBlock(headers: string, scripts: string): string {
    return SCRIPT_HEADER + headers + '\n\n' + scripts + SCRIPT_FOOTER;
}

export default class Manialink implements IManialink {
    id: string = tmc.ui.uuid();
    name: string = "";
    layer: "normal" | "ScoresTable" | "ScreenIn3d" | "altmenu" | "cutscene" = "normal";
    actions: { [key: string]: string } = {};
    data: Record<string, any> = {};
    recipient: string | undefined = undefined;
    displayDuration = 0;
    canHide = true;
    size: MlSize = { width: 120, height: 120 };
    pos: MlPos = { x: 0, y: 0, z: 0 };

    protected _jsxComponent: any;
    private _firstDisplay = true;


    constructor(jsxComponent: any) {
        this._jsxComponent = jsxComponent;
    }


    async show() {
        await this.display();
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

    /**
     * Cleans all references to allow garbage collection
     * @ignore
     */
    cleanReferences() {
        //const template = this.title || this.template || this.id;
        //tmc.debug('Cleaning references for manialink: $fff' + template);
        disposeRoot(this.id);

        for (const key of Object.keys(this.actions)) {
            try {
                tmc.ui.removeAction(this.actions[key]);
            } catch (e) {
                console.error(`Failed to remove action ${key}:`, e);
            }
        }
        this.actions = {};
        this.data = {};
        this._jsxComponent = undefined;
    }

    async destroy(hide = true) {
        // Ask UI manager to remove references and hide/destroy
        tmc.ui.destroyManialink(this, hide);
    }


    /**
     * Render the manialink to XML string
     *  @ignore
     * **/
    async render(): Promise<string> {
        let root = roots.get(this.id);
        if (!root) {
            root = { hooks: [] };
            roots.set(this.id, root);
        }

        // Reuse or create objMap to avoid allocations
        let obj = root.dataObj;
        if (!obj) {
            obj = {
                id: this.id,
                layer: this.layer,
                size: this.size,
                pos: this.pos,
                actions: this.actions,
                colors: tmc.settings.colors,
                fonts: tmc.settings.fonts,
                data: normalizeModels(this.data),
                game: tmc.game.Name,
                recipient: this.recipient,
            };
        } else {
            // Update mutable fields in-place
            obj.id = this.id;
            obj.layer = this.layer;
            obj.size = this.size;
            obj.pos = this.pos;
            obj.actions = this.actions;
            obj.colors = tmc.settings.colors;
            obj.fonts = tmc.settings.fonts;
            obj.data = normalizeModels(this.data);
            obj.game = tmc.game.Name;
            obj.recipient = this.recipient;
        }

        root.dataObj = obj;

        setCurrentRoot(root);
        setHookIndex(0);

        let jsx: string;
        let finalHookCount: number;
        try {
            const startIdx = root.hooks.length;
            const componentElement = this._jsxComponent();
            const midIdx = root.hooks.length;

            jsx = renderJsx(componentElement);

            const endIdx = root.hooks.length;

            // If the root component wrapper added hooks, move them to the end (after children)
            // Use in-place rotation instead of creating temporary arrays
            if (midIdx > startIdx && endIdx > midIdx) {
                // Reverse-rotate: move parent hooks to end by rotating the subarray
                reverseArray(root.hooks, startIdx, midIdx - 1);
                reverseArray(root.hooks, midIdx, endIdx - 1);
                reverseArray(root.hooks, startIdx, endIdx - 1);
            }

            finalHookCount = getCurrentHookIndex();
        } finally {
            setCurrentRoot(null);
        }

        // Commit phase: run pending header effects first and save header strings
        for (const hook of root.hooks) {
            if (hook.headerPending && hook.headerEffect) {
                try { hook.cleanup?.(); } catch (e) { console.error(e); }
                const result = hook.headerEffect();
                if (typeof result === 'function') {
                    // treat function return as cleanup
                    hook.cleanup = result;
                    hook.header = undefined;
                } else if (typeof result === 'string') {
                    hook.header = result;
                    // leave cleanup unchanged
                } else {
                    hook.header = undefined;
                }
                hook.headerPending = false;
            }
        }

        // Commit phase: run pending effects and save cleanups or script strings
        for (const hook of root.hooks) {
            if (hook.pending && hook.effect) {
                try { hook.cleanup?.(); } catch (e) { console.error(e); }
                const result = hook.effect();
                if (typeof result === 'function') {
                    hook.cleanup = result;
                    hook.script = undefined;
                } else if (typeof result === 'string') {
                    hook.script = result;
                    hook.cleanup = undefined;
                } else {
                    hook.script = undefined;
                    hook.cleanup = undefined;
                }
                hook.pending = false;
            }
        }

        // Trim excess hooks from previous renders to prevent memory leaks
        trimHooks(root, finalHookCount);

        // Collect unique headers and scripts without creating intermediate arrays
        const headerSet = new Set<string>();
        const scriptSet = new Set<string>();
        for (const h of root.hooks) {
            if (h.header) headerSet.add(h.header);
            if (h.script) scriptSet.add(h.script);
        }
        const headers = Array.from(headerSet).join('\n');
        const scripts = Array.from(scriptSet).join('\n');

        let combinedScripts = "";
        if (headers.length > 0 || scripts.length > 0) {
            combinedScripts = buildScriptBlock(headers, scripts);
        }


        const output = `<manialink version="3" id="${this.id}" layer="${this.layer}" name="${this.name}">
        ${jsx}
        ${tmc.game.Name !== "TmForever" ? combinedScripts : ""}
</manialink>`;

        return output;
    }

}