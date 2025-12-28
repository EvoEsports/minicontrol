import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui/forge';
import { formatTime } from '@core/utils';

export default function ListItem({ pos = '0 0', 'z-index': z, size, type = 'text', text, action, index = 0, key = -1, halign = 'left' }) {
    const psize = vec2(size);
    const ppos = vec2(pos);

    const { colors, fonts } = getProperties();
    let value = text;

    let offsetX = 0;
    if (halign === 'center') offsetX = psize.x * 0.5;
    if (halign === 'right') offsetX = psize.x;

    if (type === 'time') {
        value = formatTime(text);
    }
    if (type === 'progressbar') {
        const sizeX = psize.x * Math.min(Number.parseFloat(value), 1);
        const percentage = '$s' + (Number.parseFloat(value) * 100 || 0).toFixed(2) + '%';
        return (
            <>
                <label
                    pos={`${ppos.x + psize.x * 0.5} ${ppos.y - psize.y * 0.5}`}
                    z-index={z + 0.2}
                    size={size}
                    textfont={fonts.label}
                    textcolor={colors.window_text}
                    text={percentage}
                    halign={halign}
                    textsize="1"
                    valign="center2"
                />
                <quad pos={`${ppos.x} ${ppos.y - psize.y * 0.5}`} z-index={z + 0.1} valign="center" size={`${sizeX} ${psize.y}`} bgcolor={colors.highlight} />
                <quad pos={`${ppos.x} ${ppos.y - psize.y * 0.5}`} z-index={z} valign="center" size={size} bgcolor="777" />
            </>
        );
    }
    if (type === 'entry') {
        return (
            <>
                <entry
                    pos={`${ppos.x + offsetX} ${ppos.y - psize.y * 0.5}`}
                    z-index={z + 1}
                    size={size}
                    textfont={fonts.label}
                    textcolor={colors.window_text}
                    default={value ?? ' '}
                    halign={halign}
                    textsize="1"
                    valign="center2"
                    focusareacolor1={colors.window_bg_dark}
                    focusareacolor2="000"
                    name={`item_${key}`}
                    scriptevents="1"
                />
                <quad pos={`${ppos.x} ${ppos.y - psize.y * 0.5}`} z-index={z} valign="center" size={size} bgcolor={index % 2 ? colors.window_bg : colors.window_bg_light} />
            </>
        );
    }

    return (
        <>
            <label
                pos={`${ppos.x + offsetX} ${ppos.y - psize.y * 0.5}`}
                z-index={z + 2}
                size={size}
                textfont={fonts.label}
                textcolor={colors.window_text}
                text={value ?? ' '}
                halign={halign}
                textsize="1"
                valign="center2"
                focusareacolor1="0000"
                focusareacolor2={colors.button_bg_hover}
                action={action}
            />
            <quad pos={`${ppos.x} ${ppos.y - psize.y * 0.5}`} z-index={z} valign="center" size={size} bgcolor={index % 2 ? '0000' : colors.window_bg_light} />
        </>
    );
}
