import Widget from './widget';

export default class Confirm extends Widget {
    template = "core/templates/confirm.twig";
    callback: CallableFunction;
    params: any;
    title = "Confirm required";
    size = { width: 90, height: 40 };

    constructor(login: string, question: string, callback: CallableFunction, params: any) {
        super(login);
        this.pos = { x: 0, y: 20, z: 10 };
        this.callback = callback;        
        this.params = params;        
        this.data['question'] = question;
        this.actions['close'] = tmc.ui.addAction(this.hide.bind(this), "");
        this.actions['apply'] = tmc.ui.addAction(this.apply.bind(this), "");
    }

    /**
     * closes the window     
     */
    async hide() {
        await super.destroy();
    }

    async apply(login: string, answer: any, entries: string[]) {
            await this.callback(...this.params);
            await super.destroy();
    }
}


