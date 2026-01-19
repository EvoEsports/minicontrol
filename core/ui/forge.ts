import ComponentRegistry from "./componentregistry";
import type { ManialinkModel } from "./manialinkmodel";
import { RenderContext } from "./rendercontext";

export type FunctionalComponent<P = any> = (props: P & { children?: any }) => any;
export interface JsxElement { type: string | FunctionalComponent; props: Record<string, any>; }
export function createElement(type: string | FunctionalComponent, props: any, ...children: any[]): JsxElement {
    return { type, props: { ...props, children: children.flat() } };
}
export function Fragment(props: any) {
    return props.children || [];
}
export function vec2(str: string) {
    const [x, y] = str.split(' ').map(Number);
    return { x, y };
}

export function maniascriptFragment(text?: string) {
    const safe = (text ?? '').toString().replace(/-->/g, '');
    return `<!-- ${safe} -->`;
}

export function setScript(script: string) {
    RenderContext.active.addScript(script);
}

export function setScriptHeader(header: string) {
    RenderContext.active.addHeader(header);
}

export function getProperties(): ManialinkModel {
    return RenderContext.active.model;
}

export function getComponent(component: string, def?: any): any {
    return ComponentRegistry.get(component, def);
}


export const JsxEngine = {

    renderToString(element: any, zOffset = 0): string {
        if (element === null || element === undefined || element === false) return "";

        if (typeof element === "string" || typeof element === "number") {
            return this.escapeHtml(String(element));
        }

        if (Array.isArray(element)) {
            return element.map((child, i) => this.renderToString(child, zOffset + 0.01)).join("");
        }

        const { type, props } = element;
        const children = Array.isArray(props.children) ? props.children : [props.children];

        if (typeof type === "function") {

            const normalizedProps = this.normalizeProps(props);
            const ownZ = Number(normalizedProps["z-index"] || 0);
            const output = type(normalizedProps);
            return this.renderToString(output, ownZ + zOffset);
        }

        const ownZ = Number(props["z-index"] || 0);
        const finalZ = ownZ + zOffset;

        const attributes = this.buildAttributes({ ...props, "z-index": finalZ });
        const childrenXml = this.renderToString(children, finalZ);

        if (!childrenXml && children.length === 0) {
            return `<${type}${attributes} />\n`;
        }
        return `<${type}${attributes}>\n${childrenXml}</${type}>\n`;
    },

    escapeHtml(text: string): string {
        const trimmed = text.trim();
        if (trimmed.startsWith('')) return text;
        return text.replace(/[\u00A0-\uFFFF<>&"']/g, (i) => `&#${i.charCodeAt(0)};`);
    },

    buildAttributes(props: Record<string, any>): string {
        let result = "";
        for (const [key, val] of Object.entries(props)) {
            if (key === "children" || val === undefined || val === null || val === false) continue;

            let valStr = val;
            if (typeof val === "object" && typeof val.toJSON === "function") {
                valStr = JSON.stringify(val);
            }
            result += ` ${key}="${this.escapeHtml(String(valStr))}"`;
        }
        return result;
    },

    normalizeProps(props: any): any {
        return props;
    }
};
