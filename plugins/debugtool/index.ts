import { memInfo } from "core/utils";

export default class DebugTool {
    id: string = "";

    constructor() {
        this.id = tmc.ui.uuid();
        tmc.server.on('TMC.Init', this.onInit.bind(this));
    }
    
    async onInit() {
        this.displayMemInfo();
        setInterval(() => {
            this.displayMemInfo();
        }, 5000);
    }

    async displayMemInfo() {
        const mem = memInfo();
        const xml = `
            <manialink id="${this.id}" version="3">
                <label pos="159 -70" z-index="1" size="120 6" text="$s${mem}" textsize="1" halign="right" valign="center" />
            </manialink>`;
        tmc.ui.display(xml);
    }
}

tmc.addPlugin("debugtool", new DebugTool());