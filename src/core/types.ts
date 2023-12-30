export interface ChatCommand {
    trigger: string;
    callback: CallableFunction;
}

export interface Map {
    UId: string;  
    Name: string;  
    Author: string;
    AuthorNickName?: string;     
    AuthorTime: number;
    GoldTime: number;
    FileName: string;
    Environnement: string;
    Mood: string;
    LapRace: boolean;
    NbLaps: number;
    NbCheckpoints: number;    
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