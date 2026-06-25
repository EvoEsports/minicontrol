export default function draggableEffect(handleClassName: string = "draggable"): string {
    return `
    Void Drag() {
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
        }

        ***OnMouseClick***
        ***
        if (Event.Control.HasClass("${handleClassName}")) {
            Drag();
        }
        ***
    `;
}