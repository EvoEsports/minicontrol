import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2, setScriptHeader } from '@core/ui/forge';
import DefaultButton from './Button';

export default function Window({ title = '', 'z-index': zi = '0', pos = '0 0', size = '120 90', children = {} }) {
    const psize = vec2(size);
    const ppos = vec2(pos);
    const z = Number.parseFloat(zi);

    const { actions, colors, data, id } = getProperties();
    const draggable = data.draggable ? 'True' : 'False';

    setScript(() => {
        return `

Void SetActive() {
    declare Text[] G_MC_ActiveWindow for UI;
    G_MC_ActiveWindow.remove("${id}");
    G_MC_ActiveWindow.addfirst("${id}");
}

Void Drag() {
    SetActive();
    if (!${draggable}) return;
    declare Vec2[Text] G_MC_WindowLocations for UI;
    declare CMlFrame FrameRoot <=> Page.GetFirstChild("root") as CMlFrame;
    declare Vec2 OrigPos = <MouseX, MouseY> - FrameRoot.RelativePosition_V3;
    while (MouseLeftButton) {
        yield;
        if (MouseX <= -1000.0 && MouseY <= -1000.0) { // This happens when user holds the LMB pressed too long without any movement and game hides the cursor.
            yield;
            continue;
        }
        FrameRoot.RelativePosition_V3 = <MouseX, MouseY> - OrigPos;
    }
    G_MC_WindowLocations["${data.windowName}"] = FrameRoot.RelativePosition_V3;
}

***OnInit***
***
SetActive();
declare Text[] G_MC_ActiveWindow for UI;
declare CMlFrame FrameRoot <=> Page.GetFirstChild("root") as CMlFrame;
declare CMlQuad InactiveRoot <=> Page.GetFirstChild("inactive") as CMlQuad;
declare Vec2[Text] G_MC_WindowLocations for UI;
if (G_MC_WindowLocations.existskey("${data.windowName}")) {
   FrameRoot.RelativePosition_V3 =  G_MC_WindowLocations["${data.windowName}"];
} else {
    G_MC_WindowLocations["${data.windowName}"] = FrameRoot.RelativePosition_V3;
}
***

***Loop***
***
    if (G_MC_ActiveWindow.count > 0 && G_MC_ActiveWindow[0] == "${id}") {
        InactiveRoot.Hide();
        FrameRoot.ZIndex = 50.;
    } else {
        InactiveRoot.Show();
        FrameRoot.ZIndex = 49.;
    }
***

***OnMouseClick***
***

if (Event.ControlId == "close") {
    TriggerPageAction("${actions.close}");
}

if (Event.ControlId=="inactive") {
    SetActive();
}

if (Event.Control.HasClass("title")) {
    InactiveRoot.Hide();
    FrameRoot.ZIndex = 50.;
    Drag();
}
***
        `;
    });

    const Button = getComponent('Button', DefaultButton);
    let applyButtons: any = [];

    if (data.applyButtons) {
        applyButtons.push(<Button pos={`${psize.x - 47} -${psize.y - 11}`} z-index={z + 1} size="20 5" halign="center" text="Apply" action={actions.apply} />);
        applyButtons.push(<Button pos={`${psize.x - 25} -${psize.y - 11}`} z-index={z + 1} size="20 5" halign="center" text="Cancel" action={actions.close} />);
    }

    return (
        <>
            <frame id="root" pos={`-${psize.x * 0.5} ${psize.y * 0.5 + ppos.y}`} z-index={z}>
                <quad class="title" pos="0 0" z-index={z + 1} size={`${psize.x + 4} 6`} bgcolor={`${colors.title_bg}e`} halign="left" valign="bottom" scriptevents="1" />
                <quad pos={`${psize.x + 4} 0`} z-index={z + 2} size={`${psize.x + 4} 0.4`} bgcolor={colors.highlight} opacity="1" valign="top" halign="right" />
                <label
                    pos="2 3"
                    z-index={z + 3}
                    size={`${psize.x - 10 + 4} 4`}
                    text={title}
                    textsize="2.5"
                    valign="center2"
                    textcolor={colors.title_fg}
                    textfont="RobotoCondensedBold"
                />
                <label
                    id="close"
                    pos={`${psize.x - 4.5 + 4}  3`}
                    z-index={z + 5}
                    size="9 6"
                    halign="center"
                    valign="center2"
                    text="x"
                    textfont="RobotoCondensedBold"
                    focusareacolor1={colors.title_bg}
                    focusareacolor2="d00"
                    scriptevents="1"
                    action={actions.close}
                />
                <frame pos="2 -4" z-index={z + 2}>
                    {children}
                </frame>
                {applyButtons}
                <quad pos="0 0" z-index={z-1} size={`${psize.x + 4} ${psize.y}`} bgcolor={`${colors.window_bg}e`} />

                {tmc.game.Name !== 'TmForever'
                    ? [
                          <quad pos="-0.5 6.5" z-index={z + 2} size={`${psize.x + 1} ${psize.y + 7}`} bgcolor="0000" scriptevents="1" />,
                          <quad pos="0 0" z-index={z + 10} size={`${psize.x + 4} ${psize.y}`} bgcolor="0008" id="inactive" scriptevents="1" hidden="1" />
                      ]
                    : null}
            </frame>
        </>
    );
}
