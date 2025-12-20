import type IWindow from "./interfaces/iwindow";
import Manialink from "./manialink";
import LWindow from "./components/ListWindow";

export interface columnDef {
    title: string;
    width: number;
    description?: string;
    type?: "text" | "entry" | "time" | "date";
    action?: string;
}

export interface dataTableDef {
    columns: { [key: string]: columnDef };
    items: { [key: string]: any }[];
    listActions: { [key: string]: string };
}

export default class ListWindow extends Manialink implements IWindow {
    sortColumn = "";
    sortDirection = 1;
    datatable: dataTableDef = {
        columns: {},
        items: [],
        listActions: {},
    };
    constructor(title: string = "Window") {
        super(LWindow);
        this.data.title = title;
        this.data.draggable = tmc.game.Name !== "TmForever";
        this.actions.close = tmc.ui.addAction(() => this.destroy(), null);
    }

    setColumns(columns: { [key: string]: columnDef }) {
        this.datatable.columns = columns;
    }
    setItems(items: { [key: string]: any }[]) {
        this.datatable.items = items;
    }
    setActions(actions: { [key: string]: string }) {
        this.actions = { ...this.actions, ...actions };
    }

    doSort(columnKey: string) {
        if (this.sortColumn === columnKey) {
            this.sortDirection = -this.sortDirection;
        } else {
            this.sortColumn = columnKey;
            this.sortDirection = 1;
        }
    }
}