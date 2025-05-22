import Manialink, { type MlSize } from "./manialink";

export default class Widget extends Manialink {
    size: MlSize = { width: 32, height: 50 };

    constructor(path = "core/templates/widget.xml.twig") {
        super(undefined);
        this.template = path;
    }

    setOpenAction(action: CallableFunction) {
        if (this.actions.openWidget === undefined) {
            this.actions.openWidget = tmc.ui.addAction(action, "");
        }
    }

    setOpenActionId(actionId: string) {
        this.actions.openWidget = actionId;
    }

    setData(data: any) {
        this.data = data;
    }
}
