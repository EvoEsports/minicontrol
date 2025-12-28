import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2, setScriptHeader } from '@core/ui/forge';

export default function Confirm() {
    const { data, size, colors, fonts, pos } = getProperties();

    const out: any = [];
    let i = 0;
    for (const line of data.question.split('\n')) {
        out.push(
            <label
                pos={`0 -${i * 5}`}
                z-index={pos.z + 1}
                size={`${size.width} ${size.height}`}
                text={line}
                textcolor={colors.window_text}
                textsize="1"
                textfont={fonts.label}
            />
        );
        i += 1;
    }

    return out;
}
