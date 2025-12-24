import Manialink from "./manialink";

export default class Window extends Manialink {
    constructor(login: string) {
        super(login);
        this.actions.close = tmc.ui.addAction(async () => this.destroy(true), "");
    }

    async render() {
         const result = await super.render();
         return result;
    }
}
