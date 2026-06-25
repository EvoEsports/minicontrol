import { createElement, Fragment, getProperties } from '@core/ui/forge';

export default function VoteWidget() {
    const { data, actions, colors, fonts } = getProperties();

    const voteRatio = data.vote?.voteRatio || 0.5;
    const yesRatio = data.yes_ratio || 0;
    const timePercent = data.time_percent || 0;

    return (
        <frame scale="0.7">
            <frame pos="-35 0" z-index="5">
                <label
                    pos={`${voteRatio * 70} 2`}
                    z-index="5"
                    size="25 5"
                    text={`${voteRatio}`}
                    textfont={fonts.widget}
                    textsize="1"
                    halign="center"
                    valign="center2"
                />
                <quad
                    pos={`${voteRatio * 70} -2`}
                    size="0.5 6"
                    z-index="5"
                    bgcolor="fff"
                    valign="center"
                    halign="center"
                />
                <quad
                    pos="0 -2"
                    z-index="2"
                    size={`${yesRatio * 70} 4`}
                    bgcolor="090"
                    opacity="1"
                    valign="center"
                    halign="left"
                />
                <quad
                    pos="0 -2"
                    z-index="1"
                    size="70 4"
                    bgcolor="900"
                    opacity="1"
                    valign="center"
                    halign="left"
                />
                <quad
                    pos="35 -5.5"
                    z-index="2"
                    size={`${timePercent * 70} 0.5`}
                    bgcolor="0af"
                    opacity="0.7"
                    halign="center"
                    valign="top"
                />
                <label
                    pos="35 -7.5"
                    z-index="3"
                    size="20 5"
                    text={`${data.timer || 0}`}
                    valign="center"
                    textsize="1.2"
                    textfont={fonts.label}
                    halign="center"
                />
            </frame>

            <frame pos="0 -2" z-index="6">
                <label
                    pos="-45 -7"
                    z-index="3"
                    size="12 4"
                    text={`${data.yes || 0}`}
                    halign="center"
                    valign="center2"
                    textfont={fonts.label}
                    textsize="3"
                    textemboss="1"
                />
                <label
                    pos="45 -7"
                    z-index="3"
                    size="12 4"
                    text={`${data.no || 0}`}
                    valign="center2"
                    textfont={fonts.label}
                    textsize="3"
                    halign="center"
                />
                <label
                    pos="45 0"
                    z-index="3"
                    size="16 8"
                    text="No [F6]"
                    halign="center"
                    valign="center2"
                    textfont={fonts.label}
                    textsize="2"
                    action={actions.no}
                    actionkey="2"
                    focusareacolor1="500"
                    focusareacolor2="a00"
                />
                <label
                    pos="-45 0"
                    z-index="3"
                    size="16 8"
                    text="Yes [F5]"
                    valign="center2"
                    textfont={fonts.label}
                    halign="center"
                    textsize="2"
                    action={actions.yes}
                    actionkey="1"
                    focusareacolor1="050"
                    focusareacolor2="0a0"
                />
            </frame>
            <label
                pos="0 9"
                z-index="5"
                size="100 6"
                text={`$t${data.voteText || ''}`}
                halign="center"
                valign="center"
                textfont={fonts.title}
                textemboss="1"
            />
            <quad
                z-index="0"
                pos="0 -0.322"
                size="128 28.5"
                bgcolor={`${colors.widget_bg}a`}
                halign="center"
                valign="center"
            />
        </frame>
    );
}
