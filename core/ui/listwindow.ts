import LWindow from "./components/ListWindowComponent";
import Window from "./window";

export interface columnDef {
    title: string;
    width: number;
    description?: string;
    type?: "text" | "entry" | "time" | "date" | "progressbar" | "quad"
    actionKey?: string;
    align?: "left" | "center" | "right";
    sort?: -1 | 0 | 1;
}

export interface dataTableDef {
    columns: { [key: string]: columnDef };
    items: { [key: string]: any }[];
    listActions: Actions[];
    sortDirection: number;
    sortColumn: string;
    pageSize: number;
    pageNb: number;
    useTitle: boolean;
}

type ActionCallback = (login: string, item: any, entries: any) => Promise<void>

interface Actions {
    key: string;
    title: string | null;
    width?: number;
    callback: ActionCallback
}

export default class ListWindow extends Window {
    private targetActions: Actions[] = [];
    title = "";
    size = { width: 160, height: 120 };
    datatable: dataTableDef = {
        columns: {},
        items: [],
        listActions: [],
        sortColumn: "",
        sortDirection: 1,
        pageSize: 20,
        pageNb: 0,
        useTitle: false,
    };

    constructor(login: string, type: string = "") {
        super(LWindow, login, type);
        this.data.draggable = tmc.game.Name !== "TmForever";
        this.actions.start = tmc.ui.addAction(this.uiPaginate.bind(this), "start");
        this.actions.prev = tmc.ui.addAction(this.uiPaginate.bind(this), "prev");
        this.actions.next = tmc.ui.addAction(this.uiPaginate.bind(this), "next");
        this.actions.end = tmc.ui.addAction(this.uiPaginate.bind(this), "end");
        this.data.applyButtons = false;
    }

    setItemsPerPage(count: number) {
        this.datatable.pageSize = count;
    }

    setColumns(columns: { [key: string]: columnDef }) {
        this.datatable.columns = columns;
    }
    setItems(items: { [key: string]: any }[]) {
        this.datatable.items = items.map((item, index) => ({ index, ...item }));
    }

    setUseTitle(useTitle: boolean) {
        this.data.useTitle = useTitle;
    }

    /**
     * Sets an action for the list items
     * you can reference key in columnDef to link action to a column
     * if title is null or "", no button will be shown for this action
     * @param key
     * @param title
     * @param action
     */
    setAction(key: string, title: string | null, action: ActionCallback, width: number = 10) {
        this.targetActions.push({ key: key, title: title, width: width, callback: action });
    }

    async execAction(login: string, items: any, entries?: any) {
        const { actionIndex, item } = items;
        if (this.targetActions[actionIndex]) {
            await this.targetActions[actionIndex].callback(login, item, entries);
        }
    }

    async display() {
        this.data.title = this.title;

        for (const key in this.datatable.columns) {
            if (!this.actions[`title_${key}`]) {
                this.actions[`title_${key}`] = tmc.ui.addAction(this.doSort.bind(this), `${key}`);
            }
        }

        for (const actionIndex in this.targetActions) {
            const action = this.targetActions[actionIndex];
            for (const itemIndex in this.datatable.items) {
                const item = this.datatable.items[itemIndex];
                const actionKey = `item_${itemIndex}_${action.key}`;
                if (!this.actions[actionKey]) {
                    this.actions[actionKey] = tmc.ui.addAction(this.execAction.bind(this), { actionIndex: actionIndex, item: item });
                }
            }
        }

        const pre = this.datatable.items.slice(0, this.datatable.pageNb * this.datatable.pageSize);
        const post = this.datatable.items.slice((this.datatable.pageNb + 1) * this.datatable.pageSize);
        const paginatedItems = this.datatable.items.slice(
            this.datatable.pageNb * this.datatable.pageSize,
            (this.datatable.pageNb + 1) * this.datatable.pageSize
        );

        this.data.datatable = this.datatable;
        this.data.datatable.listActions = this.targetActions.map((a) => ({ key: a.key, title: a.title, width: a.width }));
        this.data.datatable.items = [...pre, ...await this.onPageItemsUpdate(paginatedItems), ...post].filter((i) => i !== undefined) as any[];

        return super.display();
    }

    /**
     * override this to process items on the current page
     * @param itemsArray
     * @returns
     */
    async onPageItemsUpdate(itemsArray: any[]) {
        return itemsArray;
    }

    async doSort(login: string, columnKey: string) {
        const column = this.datatable.columns[columnKey];
        if (column?.sort === 0) return;

        if (this.datatable.sortColumn === columnKey) {
            this.datatable.sortDirection = -this.datatable.sortDirection || -1;
        } else {
            this.datatable.sortColumn = columnKey;
            this.datatable.sortDirection = column?.sort || -1;
        }

        this.display();
    }

    async uiPaginate(login: string, action: string, entries: any) {
        if (action === "start") {
            this.datatable.pageNb = 0;
        } else if (action === "prev") {
            this.datatable.pageNb -= 1;
        } else if (action === "next") {
            this.datatable.pageNb += 1;
        } else if (action === "end") {
            this.datatable.pageNb = Math.floor((this.datatable.items.length - 1) / this.datatable.pageSize);
        }
        if (this.datatable.pageNb < 0) this.datatable.pageNb = 0;
        if (this.datatable.pageNb > Math.floor((this.datatable.items.length - 1) / this.datatable.pageSize))
            this.datatable.pageNb = Math.floor((this.datatable.items.length - 1) / this.datatable.pageSize);

        this.display();
    }
}
