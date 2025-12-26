import Plugin from "@core/plugins";
import Widget from "@core/ui2/widget";
import MenuButtonComponent from "./ui/MenuButton";
import MenuWidget from "./menuWidget";
import Menu from "@core/menu";

declare module "@core/plugins" {
    interface PluginRegistry {
        "menu": MenuPlugin;
    }
}

export default class MenuPlugin extends Plugin {
    menuButton: Widget | null = null;
    menuInstances: { [key: string]: Widget } = {};

    async onLoad() {
        Menu.getInstance().addItem({
            category: "Server",
            title: "Show Help",
            action: "/help",
        });

        Menu.getInstance().addItem({
            category: "Server",
            title: "Show Admin Help",
            action: "//help",
            admin: true,
        });
    }

    async onStart() {
        this.menuButton = new Widget(MenuButtonComponent, "menuButton");
        this.menuButton.pos = { x: 120, y: -65, z: 0 };
        this.menuButton.size = { width: 12, height: 5 };
        this.menuButton.setOpenAction(this.toggleMenu.bind(this));
        await this.menuButton.display();
    }

    async onUnload() {
        this.menuButton?.destroy();
        this.menuButton = null;
    }

    async toggleMenu(login: string) {
        if (!this.menuInstances[login]) {
            const menu = new MenuWidget(login, this);
            menu.pos = { x: 70, y: -15, z: -10 };
            menu.size = { width: 57, height: 50 };
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
