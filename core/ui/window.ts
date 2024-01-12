import Manialink from './manialink';
import fs from 'fs';

export default class Window extends Manialink {

    constructor(login: string) {
        super(login);            
        this.actions['close'] = tmc.ui.addAction(this.hide.bind(this), "");
    }

    /**
     * closes the window     
     */
    async hide() {        
        super.destroy();
    }
}


