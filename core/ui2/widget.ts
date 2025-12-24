import type IWidget from "./interfaces/iwidget";
import Manialink from "./manialink";
import DefaultWidget from "./components/WidgetComponent";
import { createElement, getComponent } from "./forge";
import type { ActionCallback } from "@core/uimanager";

export default class Widget extends Manialink implements IWidget {
    title: string = "Window";

    constructor(jsxComponent: any, name: string = "defautltWidget") {
        super("");
        this.name = name;
        this.data.name = name;
        this.setDraggable(true);
        this.constructWidget(jsxComponent);
    }

    setDraggable(draggable: boolean) {
        this.data.draggable = draggable;
    }

    private constructWidget(jsxComponent: any) {
        const Widget = getComponent('Widget', DefaultWidget);
        this._jsxComponent = () => Widget({
            pos: `${this.pos.x} ${this.pos.y}`,
            size: `${this.size.width} ${this.size.height}`,
            title: this.title,
            "z-index": this.pos.z || 2,
            children: createElement(jsxComponent, {})
        });
    }

    setOpenAction(action: ActionCallback) {
        this.actions.openWidget = tmc.ui.addAction(action, null);
    }

    setData(data: any) {
        this.data = Object.assign(this.data, data);
    }

}