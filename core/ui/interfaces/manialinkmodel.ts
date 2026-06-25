import type { ColorKey, FontKey } from "@core/settingsmanager";

export interface ManialinkModel {
    id: string;
    layer: string;
    actions: { [key: string]: string };
    colors: ColorKey & Record<string, string>;
    fonts: FontKey & Record<string, string>;
    data: Record<string, any>;
    game: string;
    recipient: string | undefined;
    size: { width: number; height: number };
    pos: { x: number; y: number, z: number };
}
