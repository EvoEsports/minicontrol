import { PaginationResult } from "./types";
export let colors: { [key: string]: string } = {
    white: "fff",
    black: "000",
    brand: "0af",
    bg: "026",
    cmd: "fd0",
    info: "0af",
    success: "0f0",
    warning: "fa0",
    error: "f00",
    grey: "888",
};

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
 * console.log(result);
 */
export function paginate<T>(items: T[], pageNb: number, pageSize: number): PaginationResult<T> {
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

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function processColorString(str: string, prefix: string = "$"): string {
    const matches = str.matchAll(/¤(\w+)¤/g);
    for (let match of matches) {
        const code = match[1].toString().toLowerCase();
        const vari = "COLOR_" + match[1].toString().toUpperCase();
        if (process.env[vari]) {
            str = str.replaceAll(match[0], `${prefix}${process.env[vari]}`);
        } else if (colors[code]) {
            str = str.replaceAll(match[0], `${prefix}${colors[code]}`);
        }

    }
    return str;
}

