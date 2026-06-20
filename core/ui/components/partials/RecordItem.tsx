import { createElement, Fragment, setScript, getProperties, maniascriptFragment, vec2 } from '@core/ui/forge';
import { formatTime } from '@core/utils';

export default function RecordItem({ id = '', pos = '0 0', 'z-index': z = 1, size = '100 4', nickname = '', time = 0, rank = 0, highlight = false }) {
    const { colors, fonts } = getProperties();
    const s = vec2(size);

    const bgcolor = highlight ? `${colors.highlight}9` : `${colors.widget_bg}9`;
    let rankColor = colors.widget_text;
    let diffColor = colors.widget_text;
    let diffColor2 = colors.widget_text;
    let prefix = " ";
    if (rank > 1) {
        diffColor = "900";
        diffColor2 = "900";
        prefix = "+";
    }
    let formattedTime = "$o" + formatTime(time, true, diffColor2, diffColor);
    if (rank > 1) {
        formattedTime = formattedTime.replace("00:0", "");
    }
    if (rank == 1) rankColor = 'db0e';
    if (rank == 2) rankColor = 'aabe';
    if (rank == 3) rankColor = '963e';

    return (
        <frame id={id} pos={pos} z-index="2">
            <label pos="2.5 -2" z-index="3" size="3.5 4" text={`$o${rank}`} scale="0.8" halign="center" valign="center" textsize="1" textfont={fonts.label} textcolor={rankColor} />
            <label pos="5 -2" z-index="1" size="21.5 4" text={nickname} scale="0.85" halign="left" valign="center2" textsize="1" textfont={fonts.label} textcolor="000" />
            <label pos={`${s.x - 1} -2`} z-index="3" size="30 4" text={prefix + formattedTime} halign="right" valign="center2" textsize="0.8" textfont={fonts.label} textcolor={diffColor} />

            <quad pos="0 0" z-index="-1" size={size} bgcolor={bgcolor} halign="left" />
        </frame>
    );
}



