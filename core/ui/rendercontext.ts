import type { ManialinkModel } from "./interfaces/manialinkmodel";

export class RenderContext {
    private static stack: RenderContext[] = [];

    public model: ManialinkModel;

    public headers = new Set<string>();
    public scripts = new Set<string>();

    constructor(model: ManialinkModel) {
        this.model = model;
    }

    static get active(): RenderContext {
        if (this.stack.length === 0) throw new Error("Hooks can only be used during rendering");
        return this.stack[this.stack.length - 1];
    }

    static push(ctx: RenderContext) {
        this.stack.push(ctx);
    }
    static pop() {
        this.stack.pop();
    }

    addScript(script?: string) { if (script) this.scripts.add(script); }
    addHeader(header?: string) { if (header) this.headers.add(header); }
}

