import { paginate } from "../utils";
import Window from "./window";
import fs from 'fs';

/**
 * Columns is a map of column names to column widths
 * @example {"Name": 40, "Author": 40, "Environnment": 20, "GoldTime": 20, "MapUId": 20}
 */
interface Column {
    title: string;
    key: string;
    width: number;
};

export default class ListWindow extends Window {
    private items: any = [];
    private pageSize: number;
    private currentPage: number;
    private template: string = fs.readFileSync(__dirname + "/templates/list.twig", 'utf-8');
    private paginate: { [key: string]: number } = {};
    private columns: Column[] = [];

    constructor(login: string, pageSize: number) {
        super(login);
        this.paginate['start'] = tmc.ui.addAction(this.uiPaginate.bind(this), "start");
        this.paginate['prev'] = tmc.ui.addAction(this.uiPaginate.bind(this), "prev");
        this.paginate['next'] = tmc.ui.addAction(this.uiPaginate.bind(this), "next");
        this.paginate['end'] = tmc.ui.addAction(this.uiPaginate.bind(this), "end");
        this.pageSize = pageSize;
        this.currentPage = 0;
    }

    setItemsAndColumns(items: any[], columns: Column[]) {
        this.items = items;
        this.columns = columns;
    }

    async close(login: string, data: any): Promise<void> {
        for (let action in this.paginate) {
            tmc.ui.removeAction(this.paginate[action]);
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
            this.currentPage = Math.floor(this.items.length / this.pageSize);
        }

        if (this.currentPage < 0) this.currentPage = 0;
        if (this.currentPage > Math.floor(this.items.length / this.pageSize)) this.currentPage = Math.floor(this.items.length / this.pageSize);
        this.display();
    }

    async display() {
        const itemsArray = [];
        let x = 1;
        for (let item of this.items) {
            Object.assign(item, { index: x });
            itemsArray.push(item);
            x++;
        }
        const items = paginate(itemsArray, this.currentPage, this.pageSize);
        this.content = tmc.ui.render(this.template, { data: items, columns: this.columns, currentPage: this.currentPage, paginate: this.paginate, size: this.size });
        super.display();
    }

}

