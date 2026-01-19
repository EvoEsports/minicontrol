export default class ComponentRegistry {
    private static _components = new Map<string, any>();

    static register(name: string, component: any) {
        this._components.set(name, component);
    }

    static unregister(name: string) {
        this._components.delete(name);
    }

    static has(name: string): boolean {
        return this._components.has(name);
    }

    static get(name: string, defaultComponent?: any): any {
        if (defaultComponent) {
            if (!this._components.has(name)) {
                this.register(name, defaultComponent);
            }
        }
        const comp = this._components.get(name);
        if (!comp && process.env.DEBUG === "true") {
            tmc.cli(`¤error¤Component not registered: $fff${name}`);
            tmc.cli(`¤info¤Registered components: $fff${Array.from(this._components.keys()).join(", ")}`);
            process.exit(1);
        }
        return comp;
    }

    static clear() {
        this._components.clear();
    }
}
