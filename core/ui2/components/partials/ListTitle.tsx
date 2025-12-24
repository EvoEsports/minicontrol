import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui2/forge';

export default function ListTitle({ pos = '0 0', 'z-index': z = 1, size = '100 4', text = '', halign = 'left' }) {
    const psize = vec2(size);
    const ppos = vec2(pos);

    const { colors } = getProperties();
    let value = text;

    let offsetX = 0;
    if (halign === 'center') offsetX = psize.x * 0.5;
    if (halign === 'right') offsetX = psize.x;

    return (
        <>
            <label
                pos={`${ppos.x + offsetX} ${ppos.y - psize.y * 0.5}`}
                z-index={z}
                size={size}
                textfont="RobotoCondensedBold"
                textcolor={colors.window_text}
                text={value}
                halign={halign}
                textsize="1.5"
                valign="center2"
            />
        </>
    );
}
