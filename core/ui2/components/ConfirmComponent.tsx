import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2, setScriptHeader } from '@core/ui2/forge';

export default function Confirm() {
    const { data, size, colors } = getProperties();

    const out: any = [];
    let i = 0;
    for (const line of data.question.split('\n')) {
        out.push(<label pos={`0 -${i * 5}`} size={`${size.width} ${size.height}`} text={line} textcolor={colors.window_text} textsize="1" textfont="RobotoCondensedBold" />);
        i += 1;
    }

    return out;
}
