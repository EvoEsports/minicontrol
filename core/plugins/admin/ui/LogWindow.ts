import ListWindow from "@core/ui/listwindow";
import { logLines } from "@core/log";

export default class LogWindow extends ListWindow {
    title = "Console Log";
    size = { width: 220, height: 120 };
    logType: string = "ALL";

    constructor(login: string, type: string) {
        super(login, "ConsoleLogWindow");
        this.logType = type.toUpperCase();
        this.title = `Console log: ${this.logType}`;
        this.setColumns({
            date: {
                title: "Time",
                width: 20,
                type: "text"
            },
            level: {
                title: "Level",
                width: 10,
                type: "text"
            },
            message: {
                title: "Message",
                width: 170,
                type: "text"
            }
        });
    }

    async display() {
        this.setItems(logLines.filter((val) => {
            if (this.logType === "ALL") return true;
            return val.level == this.logType;
        }
        ).toReversed());
        await super.display();
    }

}
