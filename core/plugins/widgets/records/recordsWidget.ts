import Widget from "@core/ui/widget"

export default class recordsWidget extends Widget {
    setLiveAction(action: CallableFunction) {
        if (this.actions['liveAction'] === undefined) {
            this.actions['liveAction'] = tmc.ui.addAction(action, "");
        }
    }

    setServerAction(action: CallableFunction) {
        if (this.actions['serverAction'] === undefined) {
            this.actions['serverAction'] = tmc.ui.addAction(action, "");
        }
    }

    setWorldAction(action: CallableFunction) {
        if (this.actions['worldAction'] === undefined) {
            this.actions['worldAction'] = tmc.ui.addAction(action, "");
        }
    }
}
