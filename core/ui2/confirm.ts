import Window from "./window";
import ConfirmComponent from "./components/ConfirmComponent";

/**
    @example
    const confirm = new Confirm(login, "Confirm Remove", this.applyCommand.bind(this), [login, "//remove " + item.UId]);
    await confirm.display();
 */
export default class Confirm extends Window {
    callback: CallableFunction;
    params: string[];
    title = "Confirm required";
    size = { width: 90, height: 40 };

    constructor(login: string, question: string, callback: CallableFunction, params: any) {
        super(ConfirmComponent, login, "confirmWindow");
        this.pos = { x: 0, y: 20, z: 10 };
        this.callback = callback;
        this.params = params;
        this.data.question = question;

        this.actions.close = tmc.ui.addAction(this.hide.bind(this), "");
        this.setApplyButtons(true);
    }

    /**
     * closes the window
     */
    async hide() {
        super.destroy();
    }

    async onApply(_login: string, _answer: any, _entries: any) {
        this.callback(...this.params, _entries);
        super.destroy();
    }
}
