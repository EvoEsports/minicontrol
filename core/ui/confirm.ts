import Widget from './widget';
import { htmlEntities } from '../utils';

/**
    @example
    const confirm = new Confirm(login, "Confirm Remove", this.applyCommand.bind(this), [login, "//remove " + item.UId]);
    await confirm.display();
 */
export default class Confirm extends Widget {
    callback: CallableFunction;
    params: string[];
    title = "Confirm required";
    size = { width: 90, height: 40 };

    constructor(login: string, question: string, callback: CallableFunction, params: any) {
        super("core/templates/confirm.xml.twig");
        this.recipient = login;
        this.pos = { x: 0, y: 20, z: 10 };
        this.callback = callback;
        this.params = params;
        this.data['question'] = htmlEntities(question);
        this.actions['close'] = tmc.ui.addAction(this.hide.bind(this), "");
        this.actions['apply'] = tmc.ui.addAction(this.apply.bind(this), "");
    }

    /**
     * closes the window
     */
    async hide() {
        await super.destroy();
    }

    async apply(_login: string, _answer: any, _entries: string[]) {
            await this.callback(...this.params);
            await super.destroy();
    }
}


