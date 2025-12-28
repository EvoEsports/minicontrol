import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui/forge';

export default function EmotesWidget({ text = '' }) {
    const { size, data, actions, colors, fonts } = getProperties();
    const { width, height } = size;

    return (
        <>
            <label pos="2 -2" z-index="2" size={`${width - 3} 4`} text={data.mapname} halign="left" valign="center2" textfont={fonts.widget} textsize="1.75" />
            <label pos="2 -5" z-index="2" size={`${width - 3} 4`} text={data.info} halign="left" valign="center2" textfont={fonts.widget} textsize="0.5" />
            <label pos="2 -7.5" z-index="2" size={`${width - 3} 4`} text={data.difficulty} halign="left" valign="center2" textfont={fonts.widget} textsize="0.5" />

            <label
                pos="2 -11.5"
                z-index="2"
                size={`${width - 10} 4`}
                text={`$${colors.widget_text}${data.author}`}
                halign="left"
                valign="center2"
                textcolor="fff"
                textfont={fonts.widget}
                textsize="1"
            />
            <label
                pos={`${width - 1} -11.5`}
                z-index="2"
                size="35 4"
                text={`${data.authortime}`}
                halign="right"
                valign="center2"
                textcolor="fff"
                textfont={fonts.widget}
                textsize="1"
            />

            <quad pos="2 -15.5" z-index="2" size={data.tmx.size} image={data.tmx.url} halign="left" valign="center" keepratio="Fit" url={data.tmxUrl} />
            <label
                pos={`${width - 1} -15.5`}
                z-index="2"
                size="35 4"
                text={`$${colors.widget_text}${data.wrTime}`}
                halign="right"
                valign="center2"
                textcolor="fff"
                textfont={fonts.widget}
                textsize="1"
            />

            <label
                pos="0 0"
                z-index="0"
                size={`${width} ${height}`}
                text=" "
                focusareacolor1={`${colors.widget_bg}9`}
                focusareacolor2={`${colors.highlight}e`}
                action={actions.openWidget}
            />
            <quad pos="0 0" z-index="1" size={`0.5 ${size.height}`} bgcolor={colors.highlight} />
        </>
    );
}
