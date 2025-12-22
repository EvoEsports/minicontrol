import LWindow from "./components/ListWindow";
import Window from "./window";

export interface columnDef {
    title: string;
    width: number;
    description?: string;
    type?: "text" | "entry" | "time" | "date";
    actionKey?: string;
    align?: "left" | "center" | "right";
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
        this.data.datatable = this.datatable;
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
        this.data.datatable = this.datatable;
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
        this.data.datatable.listActions = this.targetActions.map((a) => ({ key: a.key, title: a.title, width: a.width }));
        return super.display();
    }

    async doSort(login: string, columnKey: string) {
        if (this.datatable.sortColumn === columnKey) {
            this.datatable.sortDirection = -this.datatable.sortDirection || 1;
        } else {
            this.datatable.sortColumn = columnKey;
            this.datatable.sortDirection = 1;
        }

        await this.display();
    }

    async uiPaginate(login: string, action: string) {
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
        await this.display();
    }
}