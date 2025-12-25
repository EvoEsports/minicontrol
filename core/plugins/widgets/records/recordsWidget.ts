import Widget from "@core/ui2/widget";
import Records from "./records";

export default class recordsWidget extends Widget {

    constructor(playerLogin: string | undefined) {
        super(Records, "recordsWidget");
        this.recipient = playerLogin;
    }

}
