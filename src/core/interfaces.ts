export interface ChatCommand {
    trigger: string;
    callback: CallableFunction;
}

export interface GameStruct {
    Name: string;
    Version?: string;
    Build?: string;
}