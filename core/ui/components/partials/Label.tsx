import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui/forge';

export default function Label({
    id = '',
    pos = '0 0',
    'z-index': z = 1,
    textsize = '1',
    text = '',
    size = '100 6',
    halign = 'left',
    valign = 'top',
    style = '',
    scale = '1',
    link = ''
}) {
    const { data, fonts } = getProperties();

    return (
        <label
            id=""
            pos={pos}
            z-index={z}
            text={data.text ? data.text : text}
            size={size}
            textfont={fonts.label}
            textsize={textsize}
            halign={halign}
            valign={valign}
            style={style}
            scale={scale}
            url={link}
        />
    );
}
