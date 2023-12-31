import Manialink from './manialink';
import fs from 'fs';

export default abstract class Window extends Manialink {

    constructor(login: string) {
        super(login);
        this.baseTemplate = fs.readFileSync(__dirname + "/templates/window.twig", 'utf-8');
        this.actions['close'] = tmc.ui.addAction(this.close.bind(this), "");
    }
    
    async close(login: string, data: any) {
        super.hide(login, data);
    }
}


