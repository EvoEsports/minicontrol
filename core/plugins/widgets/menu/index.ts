import Plugin from "@core/plugins";
import Widget from "@core/ui/widget";
import MenuWidget from "./menuWidget";

export interface Item {
    title: string;
    action: string;
    icon?: string;
    category: string;
    admin?: boolean;
}

export class Menu {
    private items: Item[] = [];

    public addItem(item: Item) {
        this.items.unshift(item);
    }

    public removeItem(item: string) {
        this.items = this.items.filter(i => i.title !== item);
    }

    public removeCategory(category: string) {
        this.items = this.items.filter(i => i.category !== category);
    }

    public getItemsByCategory(category: string, login: string | undefined) {
        if (login === undefined) return [];
        return this.items.filter(i => {
            if ((i.admin && tmc.admins.includes(login)) || !i.admin) {
                return i.category === category;
            }
        }).sort((a, b) => a.title.localeCompare(b.title));
    }

    public getItems() {
        return this.items;
    }

}

export default class MenuPlugin extends Plugin {
    menuButton: Widget | null = null;
    menuInstances: { [key: string]: Widget } = {};

    async onLoad() {
        if (!tmc.storage["menu"]) {
            tmc.storage["menu"] = new Menu();
        }
        setTimeout(() => {
            tmc.server.emit("Plugin.Menu.onReady", tmc.storage["menu"])
        }, 200);
        if (this.menuButton) {
            await this.menuButton.destroy();
            this.menuButton = null;
        }

        this.menuButton = new Widget("core/plugins/widgets/menu/menuButton.twig");
        this.menuButton.pos = {x: 130, y: -40, z: 10};
        this.menuButton.size = {width: 12, height: 12};
        this.menuButton.setOpenAction(this.toggleMenu.bind(this));
        await this.menuButton.display();

    }

    async onUnload() {
        if (tmc.storage["menu"]) {
            delete tmc.storage["menu"];
        }
        this.menuButton?.destroy();
        this.menuButton = null;
    }

    async toggleMenu(login: string) {
        if (!this.menuInstances[login]) {
            const menu = new MenuWidget(login, "core/plugins/widgets/menu/menu.twig");
            menu.pos = {x: 125, y: -45, z: 1};
            menu.size = {width: 300, height: 400};
            this.menuInstances[login] = menu;
            await menu.display();
        } else {
            await this.hideMenu(login);
        }
    }

    async hideMenu(login: string) {
        await this.menuInstances[login].destroy();
        delete this.menuInstances[login];
    }

}



