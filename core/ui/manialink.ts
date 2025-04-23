import { createEnvironment, createFilesystemLoader, type TwingTemplate } from 'twing';
import * as fs from 'fs';

const loader = createFilesystemLoader(fs);
const environment = createEnvironment(loader, { charset: 'utf-8', parserOptions: { level: 3 } });

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
    size: MlSize = { width: 160, height: 95 };
    pos: MlPos = { x: 0, y: 10, z: 1 };
    template: string = 'core/templates/manialink.xml.twig';
    actions: { [key: string]: string } = {};
    data: { [key: string]: any } = {};
    recipient: string | undefined = undefined;
    title: string = '';
    displayDuration: number = 0;
    private _firstDisplay: boolean = true;
    _templateData: TwingTemplate | undefined = undefined;

    constructor(login: string | undefined = undefined) {
        this.recipient = login;
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
        delete this._templateData;
        await tmc.ui.destroyManialink(this);
    }

    /**
     * render manialink template
     * @returns
     */
    async render(): Promise<string> {
        const obj = {
            id: this.id,
            size: this.size,
            pos: this.pos,
            actions: this.actions,
            colors: tmc.settings.colors,
            data: this.data,
            title: this.title,
            recipient: this.recipient
        };

        if (!this._templateData) {
            try {
                this._templateData = await environment.loadTemplate(process.cwd() + '/' + this.template, 'utf-8');
                return this._templateData.render(environment, obj);
            } catch (e:any) {
                tmc.cli('Manialink error: ¤error¤ ' + e.message);
                throw new Error('Failed to load template: ' + e.message);
            }
        } else {
            try {
                return (await this._templateData?.render(environment, obj)) ?? '';
            } catch (e:any) {
                tmc.cli('Manialink error: ¤error¤ ' + e.message);
                throw new Error('Failed to render template: ' + e.message);
            }
        }
    }
}
