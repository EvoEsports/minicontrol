import { PaginationResult } from "./types";

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

