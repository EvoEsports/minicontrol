import Window from "./window";

/**
 * Columns is a map of column names to column widths
 */
interface Column {
    title: string;
    key: string;
    width: number;
    type?: string;
}

interface PaginationResult<T> {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    items: T[];
}


export default class ListWindow extends Window {
    items: any = [];
    template = "core/templates/list.twig";
    private pageSize: number = 20;
    private currentPage: number;
    listActions: string[] = [];

    constructor(login: string) {
        super(login);
        this.actions['pg_start'] = tmc.ui.addAction(this.uiPaginate.bind(this), "start");
        this.actions['pg_prev'] = tmc.ui.addAction(this.uiPaginate.bind(this), "prev");
        this.actions['pg_next'] = tmc.ui.addAction(this.uiPaginate.bind(this), "next");
        this.actions['pg_end'] = tmc.ui.addAction(this.uiPaginate.bind(this), "end");
        this.currentPage = 0;
    }

    setColumns(columns: Column[]): void {
        this.data['columns'] = columns;
    }

    setItems(items: any[]): void {
        this.items = items;
    }

    setActions(actions: string[]): void {
        this.data['listActions'] = actions;
        this.listActions = actions;
    }

    async hide(): Promise<void> {
        this.template = "";
        this.items = [];
        await super.hide();
    }
    /**
     * @param items
     * @param pageNb
     * @param pageSize 
     * @returns { PaginationResult }
     * 
     * @example
     * const myObjectList = ["1","2","3"]
     * const currentPage = 0;
     * const itemsPerPage = 15;
     *
     * const result = paginate(myObjectList, currentPage, itemsPerPage);     
     */
    doPaginate<T>(items: T[], pageNb: number, pageSize: number): PaginationResult<T> {
        const startIndex = pageNb * pageSize;
        const endIndex = startIndex + pageSize;
        const slicedItems = items.slice(startIndex, endIndex);

        return {
            currentPage: pageNb,
            totalPages: Math.ceil(items.length / pageSize),
            pageSize,
            totalItems: items.length,
            items: slicedItems,
        };
    }

    async uiPaginate(login: string, answer: any, entries: any): Promise<void> {
        if (answer == "start") {
            this.currentPage = 0;
        } else if (answer == 'prev') {
            this.currentPage -= 1;
        } else if (answer == "next") {
            this.currentPage += 1;
        } else if (answer == "end") {
            this.currentPage = Math.floor((this.items.length - 1) / this.pageSize);
        }

        if (this.currentPage < 0) this.currentPage = 0;
        if (this.currentPage > Math.floor((this.items.length - 1) / this.pageSize)) this.currentPage = Math.floor((this.items.length - 1) / this.pageSize);
        const itemsArray = [];
        let x = 1;
        for (let item of this.items) {
            Object.assign(item, {index: x});
            itemsArray.push(item);
            x++;
        }

        for (let id in this.actions) {
            if (id.startsWith("item_")) {
                tmc.ui.removeAction(this.actions[id]);
                delete this.actions[id];
            }
        }

        const items = this.doPaginate(itemsArray, this.currentPage, this.pageSize);
        for (let item of items.items) {
            for (let action of this.listActions || []) {
                if (!this.actions["item_" + action + "_" + item.index]) {
                    this.actions["item_" + action + "_" + item.index] = tmc.ui.addAction(this.uiAction.bind(this), [action, item]);
                }
            }
        }
        this.data['items'] = items;
        await super.display();
    }

    async display() {
        await this.uiPaginate("", "start", []);
        await super.display();
    }

    addApplyButtons(): void {
        this.actions['apply'] = tmc.ui.addAction(this.onApply.bind(this), "");
        this.actions['cancel'] = tmc.ui.addAction(this.hide.bind(this), "");
    }

    uiAction(login: string, answer: any): void {
        const action = answer[0];
        const item = answer[1];
        this.onAction(login, action, item);
    }

    /**
     * override this
     * @param login 
     * @param action 
     * @param item 
     */
    async onAction(login: string, action: string, item: any): Promise<void> {
        // Override this
    }

    /**
     * override this
     * @param login 
     * @param answer 
     * @param entries 
     */
    async onApply(login: string, answer: any, entries: any): Promise<void> {
        // override this
    }

}

