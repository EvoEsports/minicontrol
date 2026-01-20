import type IWidget from "./interfaces/iwidget";
import Manialink from "./manialink";
import DefaultWidget from "./components/WidgetComponent";
import { createElement, getComponent } from "./forge";
import type { ActionCallback } from "@core/uimanager";

export default class Widget extends Manialink implements IWidget {
    title: string = "Widget";
    pos = { x: 0, y: 0, z: 0 };
    size = { width: 30, height: 36 };

    constructor(jsxComponent: any, name: string = "defaultWidget") {
        const Widget = getComponent('Widget', DefaultWidget);
        super(() => Widget({
            pos: `${this.pos.x} ${this.pos.y}`,
            size: `${this.size.width} ${this.size.height}`,
            "z-index": this.pos.z || 2,
            children: createElement(jsxComponent, {})
        }));

        this.name = name;
        this.data.name = name;
        this.setDraggable(true);
    }

    setDraggable(draggable: boolean) {
        this.data.draggable = draggable;
    }

    setOpenAction(action: ActionCallback) {
        if (this.actions.openWidget) {
            tmc.ui.removeAction(this.actions.openWidget);
        }
        this.actions.openWidget = tmc.ui.addAction(action, null);
    }

    setData(data: any) {
        this.data = Object.assign(this.data, data);
    }

}