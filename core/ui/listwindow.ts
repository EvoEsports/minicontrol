import { removeColors } from "../utils.ts";
import Window from "./window";

/**
 * Columns is a map of column names to column widths
 */
interface Column {
    title: string;
    key: string;
    width: number;
    type?: string;
    action?: string;
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
    pageSize: number = 15;
    private currentPage: number;
    private sortColumn: string = "";
    private sortDirection: number = 1;

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
        let x = 0;
        for (const column of columns) {
            this.actions["title_" + x] = tmc.ui.addAction(this.doSort.bind(this), "" + column.key);
            x += 1;
        }
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

    async doSort(login: string, answer: any, entries: any): Promise<void> {
        if (this.sortColumn == answer) {
            this.sortDirection = -this.sortDirection;
        } else {
            this.sortColumn = answer;
            this.sortDirection = 1;
        }
        await this.uiPaginate(login, "start", []);
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
        if (this.sortColumn != "") {
            this.items.sort((a: any, b: any) => {
                if (removeColors(a[this.sortColumn]).localeCompare(removeColors(b[this.sortColumn]), "en", { numeric: true }) > 0) {
                    return this.sortDirection;
                }
                return -this.sortDirection;
            });
        }

        const itemsArray = [];
        let x = 1;
        for (let item of this.items) {
            Object.assign(item, { index: x });
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
        await this.onPageItemsUpdate(items.items);

        for (const item of items.items) {
            for (const action of this.listActions || []) {
                if (!this.actions["item_" + action + "_" + item.index]) {
                    this.actions["item_" + action + "_" + item.index] = tmc.ui.addAction(this.uiAction.bind(this), [action, item]);
                }
            }
            for (const column of this.data['columns']) {
                if (column.action) {
                    if (!this.actions["item_" + column.action + "_" + item.index]) {
                        this.actions["item_" + column.action + "_" + item.index] = tmc.ui.addAction(this.uiAction.bind(this), [column.action, item]);
                    }
                }
            }
        }
        this.data['items'] = items;
        await super.display();
    }

    async display() {
        await this.uiPaginate("", "start", []);
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
     */
    async onPageItemsUpdate(items:any) {

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

