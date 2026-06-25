export default interface IManialink {
    id: string;
    recipient: string | undefined;
    layer: "normal" | "ScoresTable" | "ScreenIn3d" | "altmenu" | "cutscene";
    displayDuration: number;
    canHide: boolean;
    actions: { [key: string]: string };
    data: { [key: string]: any };

    display: () => Promise<void>;
    hide: () => Promise<void>;
    destroy: (hide?: boolean) => Promise<void>;
    render: () => Promise<string>;
    cleanReferences: () => void;
}
