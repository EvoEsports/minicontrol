import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment } from '@core/ui2/forge';
import { formatTime } from '@core/utils';

export default function ListItem(props: any) {
    const { pos, size, type, text, action, index } = props || {};

    const [width, height] = size?.split(' ').map((v: string) => parseFloat(v)) || [26, 6];
    const [posX, posY] = pos?.split(' ').map((v: string) => parseFloat(v)) || [0, 0];

    const dataProps = getProperties();
    const colors = dataProps.colors;
    let value = text;

    if (type === 'time') {
        value = formatTime(text);
    }

    return (
        <>
            <label
                pos={`${posX} ${posY - height * 0.5}`}
                z-index="2"
                size={`${width} 5`}
                textfont="RobotoCondensedBold"
                textcolor={colors.window_text}
                text={value}
                halign="left"
                textsize="1.5"
                valign="center2"
                focusareacolor1="0000"
                focusareacolor2={colors.button_bg_hover}
                action={action}
            />
            <quad pos={`${posX} ${posY - height * 0.5}`} z-index="1" valign="center" size={`${width} 5`} bgcolor={index % 2 ? colors.window_bg : colors.window_bg_light} />
        </>
    );
}
