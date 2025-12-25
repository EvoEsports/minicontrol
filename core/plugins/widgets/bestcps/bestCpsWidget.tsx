import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui2/forge';

export default function bestCpsWidget() {
    const { colors, data } = getProperties();

    const out: any = [];

    for (const idx in data.checkpoints) {
        const index = Number.parseInt(idx);
        const cpdata = data.checkpoints[idx];
        if (index > data.maxCp) break;

        out.push(
            <frame pos={`${34.25 * (index % 8)} -${Math.floor(index / 8) * 3.5}`}>
                <label pos="2 -2" z-index="1" size="10 3" text={index+1} textcolor="000" halign="center" valign="center2" textsize="0.5" />
                <quad pos="2 -2" z-index="0" size="3 3" bgcolor="fffa" valign="center" halign="center" />

                <label pos="4.5 -2" z-index="1" size="19 3" text={cpdata.nickname} textcolor={colors.widget_text} halign="left" textsize="0.9" valign="center2" />
                <quad pos="3.75 -2" z-index="0" size="20 3" bgcolor={`${colors.widget_bg}a`} valign="center" halign="left" />

                <label pos="29 -2" z-index="1" size="10 3" text={cpdata.prettyTime} textcolor={colors.widget_text} halign="center" textsize="0.8" valign="center2" />
                <quad pos="29 -2" z-index="0" size="10 3" bgcolor={`${colors.widget_bg}a`} valign="center" halign="center" />
            </frame>
        );
    }

    return out;
}
