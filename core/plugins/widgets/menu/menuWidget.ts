import Widget from "@core/ui/widget";
import { type Item } from "./index";

export default class MenuWidget extends Widget {

    constructor(login: string, path: string = "core/plugins/widgets/menu/menu.twig") {
        super(path);
        const categories: Item[] = tmc.storage["menu"].getItems().map((i: Item) => i.category).filter((v: any, i: number, a: any) => a.indexOf(v) === i).sort( (a:string,b:string) => a.localeCompare(b));
        for (const item of categories) {
            if (!this.actions["cat_" + item]) {
                this.actions["cat_" + item] = tmc.ui.addAction(this.changeCategory.bind(this), item);
            }
        }
        this.data['categories'] = categories || [];
        this.data['activeCategory'] = "Players";
        this.data['isAdmin'] = tmc.admins.includes(login);
        this.recipient = login;
    }

    async display() {
        this.data['items'] = tmc.storage["menu"].getItemsByCategory(this.data['activeCategory'], this.recipient) || [];
        for (const action in this.actions) {
            if (action.startsWith("item_")) {
                tmc.ui.removeAction(this.actions[action]);
                delete this.actions[action];
            }
        }
        for (const item of this.data['items']) {
            if (!this.actions["item_" + item.title]) {
                this.actions["item_" + item.title] = tmc.ui.addAction(this.doAction.bind(this), item);
            }
        }
        await super.display();
    }

    async doAction(login: string, item: Item) {
        await tmc.chatCmd.execute(login, item.action);
    }

    async changeCategory(login: string, category: string) {
        this.data['activeCategory'] = category;
        await this.display();
    }

}