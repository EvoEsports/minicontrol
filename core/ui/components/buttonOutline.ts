import type { objMap } from "@core/ui/manialink";

/**
 * a basic template component that does nothing
 *
 * @param a attributes
 * @param inner inner content
 * @param obj object map
 *
 * @returns manialink replacement and script
 */
export default  (a: { [key: string]: any }, inner: string, obj: objMap) => {
    const [width, height] = a.size.split(" ").map((v: string) => parseFloat(v));
    const [posX, posY] = a.pos.split(" ").map((v: string) => parseFloat(v));
    let posXdiv = width ? width / 2 : 0;
    const posYdiv = height ? height / 2 : 0;

    if (a.halign === "left") {
        posXdiv = 0;
    } else if (a.halign === "right") {
        posXdiv = width;
    }
    const substyle = tmc.game.Name == "TmForever" ? "NavButton" : "BgColorContour";

     let replacement =
        `
        <frame id="${a.id ?? ""}" pos="${posX + posXdiv} ${posY - posYdiv}" class="uiContainer uiOutlineButton" z-index="${a["z-index"] || 2}" data-action="${a.action}">
        <quad size="${width*2} ${height*2}" z-index="2" scale="0.5" style="Bgs1InRace" class="${a.type}" substyle="${substyle}"
                halign="center" valign="center2"/>
        <label pos="0 0" size="${width-0.25} ${height-0.25}" text="${a.text}" class="${a.type} uiOutlineButtonElement"
          halign="${a.halign}" valign="center2" textfont="${a.textfont || "GameFontSemiBold"}" scriptevents="1" translate="0"
          textsize="1.2" focusareacolor1="${a.focusareacolor1}0" focusareacolor2="${a.focusareacolor2}" action="${a.action}"
          />
        </frame>
        `;

    const script = `
// button
Void TriggerOutlineButtonClick(CMlControl Control) {
    declare Parent = Control.Parent;
    if (Parent.HasClass("uiOutlineButton")) {
        Parent.RelativeScale = 0.75;
        AnimMgr.Add(Parent, "<elem scale=\\"1.\\" />", 200, CAnimManager::EAnimManagerEasing::QuadIn);
        TriggerPageAction(Parent.DataAttributeGet("action"));
    }
}

Void TriggerOutlineButtonClick(Text ControlId) {
    declare Control <=> Page.GetFirstChild(ControlId);
    TriggerOutlineButtonClick(Control);
}

***OnMouseClick***
***
if (Event.Control.HasClass("uiOutlineButtonElement") ) {
    TriggerOutlineButtonClick(Event.Control);
}
***

***OnMouseOver***
***
if (Event.Control.Parent.HasClass("uiOutlineButton")) {
    (Event.Control.Parent as CMlFrame).RelativeScale=1.05;
}
***

***OnMouseOut***
***
if (Event.Control.Parent.HasClass("uiOutlineButton")) {
    (Event.Control.Parent as CMlFrame).RelativeScale=1.;
}
***
`;

    return { replacement, script};
}
