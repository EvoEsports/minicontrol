import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui2/forge';

export default function ListHeader({ pos="0 0", size, text, action, halign = 'left' }) {
    const psize = vec2(size);
    const ppos = vec2(pos);

    const { colors } = getProperties();

    let offsetX = 0;
    if (halign === 'center') offsetX = psize.x * 0.5;
    if (halign === 'right') offsetX = psize.x;

    return (
        <>
            <label
                pos={`${ppos.x + offsetX} ${ppos.y}`}
                z-index="2"
                size={size}
                textfont="RobotoCondensedBold"
                textcolor={colors.window_text}
                text={`${text}`}
                halign={halign}
                textsize="1"
                valign="center2"
                focusareacolor1="0000"
                focusareacolor2={colors.button_bg_hover}
                action={action}
            />
            <quad pos={`${ppos.x} ${ppos.y - psize.y * 0.5}`} z-index="3" size={`${psize.x} .3`} bgcolor={colors.highlight} valign="bottom" />
        </>
    );
}
