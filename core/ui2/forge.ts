import { type objMap } from "@core/ui2/manialink";

export interface Properties {
    colors?: { [key: string]: string };
    [key: string]: any;
}

export interface Element {
    type: string | Function;
    props: { [key: string]: any };
}

export type ComponentType<P = any> = (props: P & { children?: any }) => any;

export function createElement(tagName: string, props, ...children): Element {
    return { type: tagName, props: { ...props, children } };
}

export function Fragment(props) {
    return props.children || [];
}

export function jsx(tagName, props, key): Element {
    let children = props.children || [];
    if (!Array.isArray(children)) children = [children];
    return createElement(tagName, { ...props, key }, ...children);
}

export function jsxs(type, props, key) {
    return jsx(type, props, key);
}

/**
 * Create an XML comment node for inclusion in JSX.
 * Example: <script>{maniascriptFragment(`log("works");`)}</script>
 */
export function maniascriptFragment(text?: string) {
    const safe = (text ?? '').toString().replace(/-->/g, '');
    return `<!-- ${safe} -->`;
}

export const comment = maniascriptFragment;

// Simple component registry for runtime overrides (suitable for plugins)
const components = new Map<string, any>();

/** Register a component by name (overrides existing) */
export function registerComponent(name: string, comp: any) {
    components.set(name, comp);
}

/** Unregister a component by name */
export function unregisterComponent(name: string) {
    components.delete(name);
}

export function getComponent(name: string): any | undefined;
export function getComponent(name: string, fallback: any): any;
export function getComponent(name: string, fallback?: any) {
    if (arguments.length === 1) {
        if (!components.has(name)) {
            if (process.env.DEBUG === "true") {
                tmc.cli(`¤error¤Component not registered: $fff${name}`);
                tmc.cli(`¤info¤Registered components: $fff${Array.from(components.keys()).join(", ")}`);
                process.exit(1);
            }
            throw Error(`Component not registered: ${name}`);
        }
        return components.get(name);
    }
    if (!components.has(name)) {
        components.set(name, fallback);
        return fallback;
    }
    return components.get(name);
}

/** For debugging: get a copy of current registration map */
export function getRegisteredComponents() {
    return new Map(components);
}

export type Hook = { deps?: any[]; effect?: () => string | (() => void); cleanup?: (() => void); pending?: boolean; script?: string; headerEffect?: () => string | (() => void); headerDeps?: any[]; headerPending?: boolean; header?: string };
export const roots = new Map<string, { hooks: Hook[]; dataObj?: objMap }>();
let currentRoot: { hooks: Hook[]; dataObj?: any } | null = null;
let hookIndex = 0;

export function setHookIndex(index: number) {
    hookIndex = index;
}

export function setCurrentRoot(root: { hooks: Hook[] } | null) {
    currentRoot = root;
}

export function setScript(effect: () => string | (() => void), deps?: any[]) {
    if (!currentRoot) throw Error("useEffect may only be used during render");
    const hooks = currentRoot.hooks;
    const idx = hookIndex++;
    const hook = hooks[idx] ?? (hooks[idx] = {});
    const prevDeps = hook.deps;
    const changed = !prevDeps || !deps || prevDeps.length !== deps.length || deps.some((d, i) => d !== prevDeps[i]);
    hook.deps = deps;
    if (changed) {
        hook.effect = effect;
        hook.pending = true;
    }
}

export function setScriptHeader(effect: () => string | (() => void), deps?: any[]) {
    if (!currentRoot) throw Error("setScriptHeader may only be used during render");
    const hooks = currentRoot.hooks;
    const idx = hookIndex++;
    const hook = hooks[idx] ?? (hooks[idx] = {});
    const prevDeps = hook.headerDeps;
    const changed = !prevDeps || !deps || prevDeps.length !== deps.length || deps.some((d, i) => d !== prevDeps[i]);
    hook.headerDeps = deps;
    if (changed) {
        hook.headerEffect = effect;
        hook.headerPending = true;
    }
}

export function getProperties(): objMap {
    // Access the object attached to the current render root (if any)
    return currentRoot?.dataObj as objMap || {};
}

export function disposeScript(rootId = 'default') {
    const root = roots.get(rootId);
    if (!root) return;
    for (const h of root.hooks) {
        try { h.cleanup?.(); } catch (e) { console.error(e); }
    }
    roots.delete(rootId);
}

// Wrap render to set current root, attach dataObj and commit effects
export function render(element: any, rootId = 'default', obj?: objMap): string {
    let root = roots.get(rootId);
    if (!root) {
        root = { hooks: [] };
        roots.set(rootId, root);
    }

    // Attach the provided data object to the root so it can be merged into every component's props
    root.dataObj = obj;

    currentRoot = root;
    hookIndex = 0;

    let jsx = renderJsx(element);

    currentRoot = null;

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

    // Commit phase: run pending body effects and save cleanups or script strings
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

    const headersArray = root.hooks.map(h => h.header).filter(Boolean);
    const uniqueHeaders = Array.from(new Set(headersArray));
    const headers = uniqueHeaders.join('\n');

    const scriptsArray = root.hooks.map(h => h.script).filter(Boolean);
    const uniqueScripts = Array.from(new Set(scriptsArray));
    const scripts = uniqueScripts.join('\n');

    const output = `<manialink id="" version="3">
      ${jsx}
      <script><!--
        #Include "TextLib" as TextLib
        #Include "MathLib" as MathLib
        #Include "AnimLib" as AnimLib
        #Include "ColorLib" as ColorLib

        ${headers}

        ${scripts}

        Void _nothing() {
        }

        main() {
            declare CMlScriptEvent Event = CMlScriptEvent;
            +++OnInit+++

            while(True) {
            yield;
            if (!PageIsVisible || InputPlayer == Null) {
                    continue;
            }

            foreach (OrigEvent in PendingEvents) {
                    Event = OrigEvent;
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

                +++Loop+++
            }
        }

        --></script>
    </manialink>`;

    return output;
}

export function renderJsx(element: any): string {
    if ([null, undefined, false].includes(element)) return ""; // Empty
    if (typeof element === "string") {
        const text = element;
        const trimmed = text.trim();
        // Allow XML-style comments to pass through without being escaped so they render as comments
        if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) {
            return text;
        }
        return escapeForHtml(element); // Text
    }
    if (typeof element === "number") return element.toString(); // Number
    if (Array.isArray(element)) return element.map(renderJsx).join(""); // List

    if (typeof element !== "object") throw Error("Element must be an object");
    const { type, props } = element;
    if (typeof type === "function") {
        const compProps = { ...(props || {}) };
        if (currentRoot && currentRoot.dataObj !== undefined && compProps.obj === undefined) {
            compProps.colors = tmc.settings.colors;
        }
        return renderJsx(type(compProps)); // Component
    }

    let { children = [], ...attrs } = props || {};
    if (!Array.isArray(children)) children = [children];
    const attrsStr = attrsToStr(attrs);

    if (children.length == 0) return `<${type}${attrsStr} />`;

    const childrenStr = renderJsx(children);
    return `<${type}${attrsStr}>${childrenStr}</${type}>`;
}

/* Convert &, <, >, ", ' to escaped HTML codes to prevent XSS attacks */
function escapeForHtml(unsafeText: string) {
    return (unsafeText || "").replace(/[\u00A0-\uFFFF<>&"']/g, (i) => `&#${i.charCodeAt(0)};`);
}

/* Convert an object of HTML attributes to a string */
function attrsToStr(attrs: Record<string, any>) {
    const illegal = /[ "'>\/= \u0000-\u001F\uFDD0-\uFDEF\uFFFF\uFFFE]/;
    const result = Object.entries(attrs)
        .map(([key, value]) => {
            if (illegal.test(key)) {
                throw Error(`Illegal attribute name: ${key}`);
            }
            if (value === true) return ` ${key}`; // Boolean (true)
            // Skip null, undefined and false values
            if (value == null || value === false) return null; // Skipped
            const escapedValue = escapeForHtml(value.toString());
            return ` ${key}="${escapedValue}"`;
        })
        .filter(Boolean)
        .join("");
    return result;
}