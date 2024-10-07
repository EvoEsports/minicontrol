import Manialink, { type MlSize } from './manialink';


export default class Widget extends Manialink {
    size: MlSize = { width: 32, height: 50 };

    constructor(path: string = "core/ui/widget.twig") {
        super();
        this.template = path;
    }

    setOpenAction(action: CallableFunction) {
        if (this.actions['openWidget'] == undefined) {
            this.actions['openWidget'] = tmc.ui.addAction(action, "");
        }
    }

    setLiveAction(action: CallableFunction) {
        if (this.actions['liveAction'] == undefined) {
            this.actions['liveAction'] = tmc.ui.addAction(action, "");
        }
    }

    setServerAction(action: CallableFunction) {
        if (this.actions['serverAction'] == undefined) {
            this.actions['serverAction'] = tmc.ui.addAction(action, "");
        }
    }

    setWorldAction(action: CallableFunction) {
        if (this.actions['worldAction'] == undefined) {
            this.actions['worldAction'] = tmc.ui.addAction(action, "");
        }
    }

    setOpenActionId(actionId: string) {
        this.actions['openWidget'] = actionId;
    }

    setData(data: any) {
        this.data = data;
    }
}
