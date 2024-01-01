import { colors, paginate } from "../utils";
import Window from "./window";
import fs from 'fs';

/**
 * Columns is a map of column names to column widths
 */
interface Column {
    title: string;
    key: string;
    width: number;
};

export default class ListWindow extends Window {
    private items: any = [];
    private pageSize: number = 20;
    private currentPage: number;
    private template: string = fs.readFileSync(__dirname + "/templates/list.twig", 'utf-8');
    private paginate: { [key: string]: number } = {};
    private tempActions: { [key: string]: number } = {};

    private listActions: string[];
    private columns: Column[] = [];

    constructor(login: string) {
        super(login);
        this.paginate['start'] = tmc.ui.addAction(this.uiPaginate.bind(this), "start");
        this.paginate['prev'] = tmc.ui.addAction(this.uiPaginate.bind(this), "prev");
        this.paginate['next'] = tmc.ui.addAction(this.uiPaginate.bind(this), "next");
        this.paginate['end'] = tmc.ui.addAction(this.uiPaginate.bind(this), "end");     
        this.currentPage = 0;
        this.listActions = [];
    }

    setColumns(columns: Column[]): void {
        this.columns = columns;
    }

    setItems(items: any[]): void {
        this.items = items;        
    }

    setActions(actions: string[]): void {
        this.listActions = actions;
    }

    async close(login: string, data: any): Promise<void> {
        for (let action in this.paginate) {
            tmc.ui.removeAction(this.paginate[action]);
        }
        for (let action in this.tempActions) {
            tmc.ui.removeAction(this.tempActions[action]);
        }
        super.close(login, data);
    }

    uiPaginate(login: string, answer: any): void {
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
            Object.assign(item, { index: x });
            itemsArray.push(item);
            x++;
        }

        const items = paginate(itemsArray, this.currentPage, this.pageSize);
        for (let item of items.items) {
            for (let action of this.listActions || []) {
                if (!this.tempActions[action + "_" + item.index]) {                    
                    this.tempActions[action + "_" + item.index] = tmc.ui.addAction(this.uiAction.bind(this), [action, item]);
                }
            }
        }
        this.content = tmc.ui.render(this.template, { data: items, columns: this.columns, currentPage: this.currentPage, paginate: this.paginate, size: this.size, listActions: this.listActions, tempActions: this.tempActions, colors: colors });
        /*let debug = this.content.split("\r\n");
        let i = 1;
        let out = "";
        for (let line of debug) {
            out += i++ + " " + line + "\n";
        }
        console.log(out); */

        super.display();
    }

    async display() {
        this.uiPaginate(this.login, "start");
        super.display();
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
    onAction(login: string, action: string, item: any): void {
        // Override this
    }
}

