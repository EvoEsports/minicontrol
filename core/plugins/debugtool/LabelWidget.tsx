import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2, setScriptHeader } from '@core/ui/forge';

export default function LabelWidget() {
    const { data } = getProperties();
    return <label pos="0 0" z-index="1" size="240 6" text={data.text} textprefix="$s" textsize="1" halign="right" valign="center" />;
}
