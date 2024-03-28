import Manialink from './manialink';

export default class Window extends Manialink {

    constructor(login: string) {
        super(login);            
        this.actions['close'] = tmc.ui.addAction(this.hide.bind(this), "");
    }

    /**
     * closes the window     
     */
    async hide() {        
        await super.destroy();
    }
}


