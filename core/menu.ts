export interface Item {
    title: string;
    action: string;
    icon?: string;
    category: string;
    admin?: boolean;
}

export default class Menu {
    private static instance: Menu;
    private items: Item[] = [];

    private constructor() {}

    public static getInstance(): Menu {
        if (!Menu.instance) {
            Menu.instance = new Menu();
        }
        return Menu.instance;
    }

    public addItem(item: Item) {
        this.items.unshift(item);
    }

    public removeItem(item: string) {
        this.items = this.items.filter((i) => i.title !== item);
    }

    public removeCategory(category: string) {
        this.items = this.items.filter((i) => i.category !== category);
    }

    public getItemsByCategory(category: string, login: string | undefined) {
        if (login === undefined) return [];
        return this.items
            .filter((i) => {
                if ((i.admin && tmc.admins.includes(login)) || !i.admin) {
                    return i.category === category;
                }
            })
            .sort((a, b) => a.title.localeCompare(b.title))
            .sort((a, b) => {
                if (a.admin && !b.admin) return 1;
                if (!a.admin && b.admin) return -1;
                return 0;
            });
    }

    public getItems() {
        return this.items;
    }
}
