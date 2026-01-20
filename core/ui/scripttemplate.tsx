export const SCRIPT_TEMPLATE = (headers: string, body: string) => `
<script><!--
#Include "TextLib" as TextLib
#Include "MathLib" as MathLib
#Include "AnimLib" as AnimLib
#Include "ColorLib" as ColorLib

#Struct K_CustomScriptEvent {
    CMlScriptEvent::Type Type;
    CMlControl Control;
    Text ControlId;
    Integer KeyCode;
    Text KeyName;
    Text CharPressed;
}

${headers}

${body}

Void _nothing() {
}

main() {
    declare K_CustomScriptEvent Event;
    +++OnInit+++

    while(True) {
        if (!PageIsVisible || InputPlayer == Null) {
            yield;
            continue;
        }

        {
            +++PreLoop+++
        }

        foreach (OrigEvent in PendingEvents) {
            Event.Type = OrigEvent.Type;

            if (OrigEvent.Type == CMlScriptEvent::Type::KeyPress) {
                Event.KeyCode = OrigEvent.KeyCode;
                Event.KeyName = OrigEvent.KeyName;
                Event.CharPressed = OrigEvent.CharPressed;
                Event.Control = Null;
                Event.ControlId = "";
            } else {
                Event.KeyCode = 0;
                Event.KeyName = "";
                Event.CharPressed = "";
                Event.Control = OrigEvent.Control;
                Event.ControlId = OrigEvent.ControlId;
            }

            switch (Event.Type) {
                case CMlScriptEvent::Type::EntrySubmit: {
                    +++EntrySubmit+++
                }
                case CMlScriptEvent::Type::KeyPress: {
                    +++OnKeyPress+++
                }
                case CMlScriptEvent::Type::MouseClick: {
                    +++OnMouseClick+++
                }
                case CMlScriptEvent::Type::MouseRightClick: {
                    +++OnMouseRightClick+++
                }
                case CMlScriptEvent::Type::MouseOut: {
                    +++OnMouseOut+++
                }
                case CMlScriptEvent::Type::MouseOver: {
                    +++OnMouseOver+++
                }
            }
        }
        {
            +++Loop+++
        }
        yield;
    }
}
--></script>`;
