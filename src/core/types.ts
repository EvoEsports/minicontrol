export interface ChatCommand {
    trigger: string;
    callback: CallableFunction;
}

export interface GameStruct {
    Name: string;
    Version?: string;
    Build?: string;
}
export interface PaginationResult<T> {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    items: T[];
}