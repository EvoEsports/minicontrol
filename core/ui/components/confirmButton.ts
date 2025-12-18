/**
 * a basic template component that does nothing
 *
 * @param a attributes
 * @param inner inner content
 * @param obj object map
 *
 * @returns manialink replacement and script
 */
export default  (a: { [key: string]: any }) => {
    const [width, height] = a.size.split(" ").map((v: string) => parseFloat(v));
    const [posX, posY] = a.pos.split(" ").map((v: string) => parseFloat(v));
    let posXdiv = width ? width / 2 : 0;
    const posYdiv = height ? height / 2 : 0;

    if (a.halign === "left") {
        posXdiv = 0;
    } else if (a.halign === "right") {
        posXdiv = width;
    }

     let replacement =
        `
        <frame id="${a.id ?? ""}" pos="${posX + posXdiv} ${posY - posYdiv}" class="uiContainer uiConfirmButton" z-index="${a["z-index"] || 2}" data-action="${a.action}">
        <quad size="${width*2} ${height*2}" scale="0.5" style="Bgs1InRace" class="${a.type}" substyle="BgColorContour"
                halign="center" valign="center2"/>
        <label pos="0 0.5" size="${width} ${height}" text="${a.text}" class="${a.type} uiConfirmButtonElement"
          halign="${a.halign}" valign="center" textfont="${a.textfont || "GameFontSemiBold"}" scriptevents="1" translate="0"
          textsize="1.2" focusareacolor1="${a.focusareacolor1}0" focusareacolor2="${a.focusareacolor2}"
          />
        </frame>
        `;

    const script = `
***OnInit***
***
declare Integer[Ident] pendingConfirms for Page = Integer[Ident];
declare Text[Ident] pendingConfirmIds for Page = Text[Ident];
declare CMlLabel[Ident] pendingConfirmControls for Page = CMlLabel[Ident];

pendingConfirms.clear();
pendingConfirmIds.clear();
pendingConfirmControls.clear();
***

***Loop***
***
foreach (Id => Time in pendingConfirms) {
    if (Now > Time + (3 * 1000) ) {
        if (pendingConfirmIds.existskey(Id))  {
            pendingConfirmControls[Id].Value = pendingConfirmIds[Id];
            pendingConfirmIds.removekey(Id);
            pendingConfirms.removekey(Id);
            pendingConfirmControls.removekey(Id);
        }
    }
}
***

***OnMouseClick***
***
if (Event.Control.HasClass("uiConfirmButtonElement") ) {
    TriggerConfirmButtonClick((Event.Control as CMlLabel));
}
***

***OnMouseOver***
***
if (Event.Control.Parent.HasClass("uiConfirmButton")) {
    (Event.Control.Parent as CMlFrame).RelativeScale=1.1;
}
***

***OnMouseOut***
***
if (Event.Control.Parent.HasClass("uiConfirmButton")) {
    (Event.Control.Parent as CMlFrame).RelativeScale=1.;
}
***

Void TriggerConfirmButtonClick(CMlLabel Control) {
    declare Integer[Ident] pendingConfirms for Page = Integer[Ident];
    declare Text[Ident] pendingConfirmIds for Page = Text[Ident];
    declare CMlLabel[Ident] pendingConfirmControls for Page = CMlLabel[Ident];

    if (Control.Parent.HasClass("uiConfirmButton")) {
        if (pendingConfirmIds.existskey(Control.Id) == False) {
            pendingConfirmIds[Control.Id] = Control.Value;
            pendingConfirmControls[Control.Id] = Control;
            pendingConfirms[Control.Id] = Now;
            Control.Value = "Confirm ?";
            Control.Parent.RelativeScale = 0.75;
            AnimMgr.Add(Control.Parent, "<elem scale=\\"1.\\" />", 200, CAnimManager::EAnimManagerEasing::QuadIn);
        } else {
            Control.Value = pendingConfirmIds[Control.Id];
            pendingConfirmIds.removekey(Control.Id);
            pendingConfirms.removekey(Control.Id);
            pendingConfirmControls.removekey(Control.Id);
            Control.Parent.RelativeScale = 0.75;
            AnimMgr.Add(Control.Parent, "<elem scale=\\"1.\\" />", 200, CAnimManager::EAnimManagerEasing::QuadIn);
            TriggerPageAction(Control.Parent.DataAttributeGet("action"));
        }
    }
}

Void TriggerConfirmButtonClick(Text ControlId) {
    declare CMlLabel Control = (Page.GetFirstChild(ControlId) as CMlLabel);
    TriggerConfirmButtonClick(Control);
}
`;

    return { replacement, script};
}
