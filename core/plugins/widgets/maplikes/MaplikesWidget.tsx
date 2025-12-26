import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui/forge';

export default function EmotesWidget() {
    const { size, data, actions, colors } = getProperties();
    const { width, height } = size;

    return (
        <>
            <label pos={`2 -${height * 0.5}`} z-index="1" size={`4 ${height}`} text="" textsize="1" halign="left" valign="center2" />
            <label
                pos={`7 -${height * 0.5}`}
                z-index="1"
                size={`${width} ${height}`}
                text={`${data.positive} likes on this map`}
                halign="left"
                valign="center2"
                textfont="RobotoCondensedBold"
                textsize="1"
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
