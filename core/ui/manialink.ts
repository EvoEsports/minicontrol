import Twig from 'twig';
import fs from 'fs';
Twig.cache(false);

export interface MlSize {
    width: number;
    height: number;
}

export interface MlPos {
    x: number;
    y: number;
    z: number;
}

export default class Manialink {
    id: string = tmc.ui.uuid();
    size: MlSize = { width: 160, height: 90 };
    pos: MlPos = { x: 0, y: 20, z: 1 };
    template: string = "core/templates/manialink.xml.twig";
    actions: { [key: string]: string } = {};
    data: { [key: string]: any } = {};
    recipient: string | undefined = undefined;
    title: string = "";
    private _firstDisplay: boolean = true;
    _templateData: string = "";

    constructor(login: string | undefined = undefined) {
        this.recipient = login
    }

    async display() {
        if (this._firstDisplay) {
            this._firstDisplay = false;
            await tmc.ui.displayManialink(this);
        } else {
            await tmc.ui.refreshManialink(this);
        }
    }

    async hide() {
        await tmc.ui.hideManialink(this);
    }

    async destroy() {
        await tmc.ui.destroyManialink(this);
    }

    /**
     * render manialink template
     * @returns
     */
    render(): string {
        if (this._templateData == "") {
            this._templateData = fs.readFileSync(process.cwd() + "/" + this.template, 'utf-8');
        }
        const template = Twig.twig({
            base: process.cwd() + "/",
            path: process.cwd() + "/",
            data: this._templateData,
            async: false,
            options: {
                autoescape: true
            }
        });
        return template.render({
            id: this.id,
            size: this.size,
            pos: this.pos,
            actions: this.actions,
            colors: tmc.colors,
            data: this.data,
            title: this.title,
            recipient: this.recipient
        });
    }
}
