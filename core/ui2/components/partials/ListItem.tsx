import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui2/forge';
import { formatTime } from '@core/utils';

export default function ListItem({ pos = '0 0', size, type = 'text', text, action, index = 0, key = -1, halign = 'left' }) {
    const psize = vec2(size);
    const ppos = vec2(pos);

    const { colors } = getProperties();
    let value = text;

    let offsetX = 0;
    if (halign === 'center') offsetX = psize.x * 0.5;
    if (halign === 'right') offsetX = psize.x;

    if (type === 'time') {
        value = formatTime(text);
    }
    if (type === 'entry') {
        return (
            <>
                <entry
                    pos={`${ppos.x + offsetX} ${ppos.y - psize.y * 0.5}`}
                    z-index="2"
                    size={size}
                    textfont="RobotoCondensedBold"
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
                <quad pos={`${ppos.x} ${ppos.y - psize.y * 0.5}`} z-index="1" valign="center" size={size} bgcolor={index % 2 ? colors.window_bg : colors.window_bg_light} />
            </>
        );
    }

    return (
        <>
            <label
                pos={`${ppos.x + offsetX} ${ppos.y - psize.y * 0.5}`}
                z-index="2"
                size={size}
                textfont="RobotoCondensedBold"
                textcolor={colors.window_text}
                text={value ?? ' '}
                halign={halign}
                textsize="1"
                valign="center2"
                focusareacolor1="0000"
                focusareacolor2={colors.button_bg_hover}
                action={action}
            />
            <quad pos={`${ppos.x} ${ppos.y - psize.y * 0.5}`} z-index="1" valign="center" size={size} bgcolor={index % 2 ? colors.window_bg : colors.window_bg_light} />
        </>
    );
}
