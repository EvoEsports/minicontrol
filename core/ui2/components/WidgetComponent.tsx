import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2, setScriptHeader } from '@core/ui2/forge';

export default function Widget({ 'z-index': z = 0, pos = '0 0', size = '38 6', children = {} }) {
    const psize = vec2(size);
    const ppos = vec2(pos);

    const { actions, colors, data } = getProperties();
    const draggable = data.draggable ? 'True' : 'False';

    setScript(() => {
        return `

Void Drag() {
    if (!${draggable}) return;
    declare Vec2[Text] G_MC_WidgetLocations for UI;
    declare CMlFrame FrameRoot <=> Page.GetFirstChild("root") as CMlFrame;
    declare Vec2 OrigPos = <MouseX, MouseY> - FrameRoot.RelativePosition_V3;
    while (MouseLeftButton) {
        yield;
        if (MouseX <= -1000.0 && MouseY <= -1000.0) { // This happens when user holds the LMB pressed too long without any movement and game hides the cursor.
            continue;
        }
        FrameRoot.RelativePosition_V3 = <MouseX, MouseY> - OrigPos;
    }
    G_MC_WidgetLocations["${data.name}"] = FrameRoot.RelativePosition_V3;
}

***OnInit***
***
declare Boolean G_MC_MoveWidgets for ClientUI = False;

declare CMlFrame FrameRoot <=> Page.GetFirstChild("root") as CMlFrame;
declare CMlLabel LabelHandle <=> Page.GetFirstChild("handle") as CMlLabel;
declare Vec2[Text] G_MC_WidgetLocations for UI;
if (G_MC_WidgetLocations.existskey("${data.name}")) {
   FrameRoot.RelativePosition_V3 =  G_MC_WidgetLocations["${data.name}"];
} else {
    G_MC_WidgetLocations["${data.name}"] = FrameRoot.RelativePosition_V3;
}
***


***Loop***
***
LabelHandle.Visible = G_MC_MoveWidgets;
***

***OnMouseClick***
***
if (Event.Control.HasClass("draggable")) {
    Drag();
}
***
        `;
    });

    let move = null;
    if (actions.move) {
        move = (
            <label
                pos={pos}
                size={size}
                z-index="20"
                text=" "
                focusareacolor1={data.moveActive ? '0000' : colors.highlight + '8'}
                focusareacolor2={colors.highlight + 'd'}
                action={actions.move}
            />
        );
    }

    return (
        <>
            {move}
            <frame id="root" pos={`${ppos.x} ${ppos.y}`} z-index={z}>
                <frame pos="0 0" z-index={z + 1}>
                    {children}
                </frame>
                {tmc.game.Name != 'TmForever' ? (
                    <label
                        id="handle"
                        pos={`${psize.x * 0.5} -${psize.y * 0.5}`}
                        text=""
                        class="draggable"
                        z-index={z + 10}
                        size={`${psize.x} ${psize.y}`}
                        textsize="2"
                        halign="center"
                        valign="center2"
                        focusareacolor1={`${colors.highlight}8`}
                        focusareacolor2={`${colors.highlight}d`}
                        scriptevents="1"
                        hidden="1"
                    />
                ) : null}
            </frame>
        </>
    );
}
