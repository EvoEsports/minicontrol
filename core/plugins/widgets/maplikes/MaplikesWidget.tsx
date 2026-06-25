import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui/forge';

export default function EmotesWidget() {
    const { size, data, actions, colors, fonts } = getProperties();
    const { width, height } = size;

    return (
        <>
            <label
                pos={`7 -${height * 0.5}`}
                z-index="1"
                size={`${width} ${height}`}
                text={`$o${data.positive}$o likes`}
                halign="left"
                valign="center2"
                textfont={fonts.widget}
                textsize="1"
                textcolor={`${colors.widget_text}`}
            />
            <label
                pos="0 0"
                z-index="0"
                size={`${width} ${height}`}
                text=" "
                focusareacolor1={`${colors.widget_bg}9`}
                focusareacolor2={`${colors.highlight}e`}
                action={actions.like}
            />
            <quad pos="0 0" z-index="1" size={`0.5 ${size.height}`} bgcolor={colors.highlight} />
        </>
    );
}
