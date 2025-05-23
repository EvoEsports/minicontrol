import Manialink from "./manialink";

export default class Window extends Manialink {
    constructor(login: string) {
        super(login);
        this.actions.close = tmc.ui.addAction(this.destroy.bind(this), "");
    }
}
