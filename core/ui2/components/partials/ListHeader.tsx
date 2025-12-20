import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment } from '@core/ui2/forge';

export default function ListHeader(props: any) {
    const { pos, width, text, action } = props || {};
    const dataProps = getProperties();
    const colors = dataProps.colors;
    const data = dataProps.data;

    return (
        <>
            <label
                pos={pos}
                z-index="2"
                size={`${width} 5`}
                textfont="RobotoCondensedBold"
                textcolor={colors.window_text}
                text={text}
                halign="left"
                textsize="1.5"
                valign="center2"
                focusareacolor1="0000"
                focusareacolor2={colors.button_bg_hover}
                action={action}
            />
            <quad pos={`${pos} 5`} z-index="3" size={`${width} .2`} bgcolor={colors.black} valign="bottom" />
        </>
    );
}
