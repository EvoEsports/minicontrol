import Plugin from "@core/plugins";
import Widget from "@core/ui/widget";
import MenuWidget from "./menuWidget";


export default class MenuPlugin extends Plugin {
    menuButton: Widget | null = null;
    menuInstances: { [key: string]: Widget } = {};

    async onStart() {
        this.menuButton = new Widget("core/plugins/menu/menuButton.xml.twig");
        this.menuButton.pos = {x: 120, y: -65, z: 10};
        this.menuButton.size = {width: 12, height: 5};
        this.menuButton.setOpenAction(this.toggleMenu.bind(this));
        await this.menuButton.display();
    }

    async onUnload() {
        this.menuButton?.destroy();
        this.menuButton = null;
    }

    async toggleMenu(login: string) {
        if (!this.menuInstances[login]) {
            const menu = new MenuWidget(login, "core/plugins/menu/menu.xml.twig", this);
            menu.pos = {x: 70, y: -15, z: 10};
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



