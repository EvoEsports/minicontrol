import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui2/forge';

export default function Label({ id = '', pos = '0 0', 'z-index': z = 1, textsize = '1', text = '', size = '', halign = 'left', valign = 'top', style = '', scale="1" }) {
    const { data } = getProperties();

    return (
        <label
            id=""
            pos={pos}
            z-index={z}
            text={data.text ? data.text : text}
            size={size}
            textfont="RobotoCondensedBold"
            textsize={textsize}
            halign={halign}
            valign={valign}
            style={style}
            scale={scale}
        />
    );
}
