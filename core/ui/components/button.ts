
export default (a: { [key: string]: any }) => {
    const [width, height] = a.size?.split(" ").map((v: string) => parseFloat(v)) || [26,6];
    const [posX, posY] = a.pos?.split(" ").map((v: string) => parseFloat(v)) || [0,0];
    let posXdiv = width ? width / 2 : 0;
    const posYdiv = height ? height / 2 : 0;

    if (a.halign === "left") {
        posXdiv = 0;
    } else if (a.halign === "right") {
        posXdiv = width;
    }

    let replacement =
        `
        <frame id="${a.id ?? ""}" pos="${posX + posXdiv} ${posY - posYdiv}" class="uiContainer uiButton" z-index="${a["z-index"] || 2}" data-action="${a.action}">
          <label size="${width} ${height}" text="${a.text}" class="${a.type} uiButtonElement"
          halign="${a.halign}" valign="center" textfont="${a.textfont || "GameFontSemiBold"}" scriptevents="1" translate="0"
          textsize="1.2" action="${a.action}"
          focusareacolor1="${a.focusareacolor1}" focusareacolor2="${a.focusareacolor2}"
          />
        </frame>
        `;

    const script = `
// button
Void TriggerButtonClick(CMlControl Control) {
    declare Parent = Control.Parent;
    if (Parent.HasClass("uiButton")) {
        Parent.RelativeScale = 0.75;
        AnimMgr.Add(Parent, "<elem scale=\\"1.\\" />", 200, CAnimManager::EAnimManagerEasing::QuadIn);
        TriggerPageAction(Parent.DataAttributeGet("action"));
    }
}

Void TriggerButtonClick(Text ControlId) {
    declare Control <=> Page.GetFirstChild(ControlId);
    TriggerButtonClick(Control);
}

***OnMouseClick***
***
if (Event.Control.HasClass("uiButtonElement") ) {
    TriggerButtonClick(Event.Control);
}
***

***OnMouseOver***
***
if (Event.Control.Parent.HasClass("uiButton")) {
    (Event.Control.Parent as CMlFrame).RelativeScale=1.1;
}
***

***OnMouseOut***
***
if (Event.Control.Parent.HasClass("uiButton")) {
    (Event.Control.Parent as CMlFrame).RelativeScale=1.;
}
***
`;

    return {
        replacement,
        script
    };
}