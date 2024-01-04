import Manialink from './manialink';
import fs from 'fs';

export default class Window extends Manialink {

    constructor(login: string) {
        super(login);
        this.baseTemplate = fs.readFileSync(import.meta.dir + "/templates/window.twig", 'utf-8');
        this.actions['close'] = tmc.ui.addAction(this.hide.bind(this), "");
    }

    /**
     * closes the window
     * @param login 
     * @param data 
     */
    async hide(login: string, data: any) {
        this.baseTemplate = "";
        super.hide(login, data);
    }
}


