import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui/forge';
import Button from '../Button';

export default function PaginateControls({ pos = '0 0', "z-index": z = 1, data }) {
    const totalPages = Math.ceil(data.items.length / data.pageSize);
    if (totalPages <= 1) return [];

    const ppos = vec2(pos);
    const { actions } = getProperties();
    const text = `${data.pageNb + 1} / ${totalPages}`;

    return [
        <Button pos={`${ppos.x - 15 - 2.5} ${ppos.y}`} z-index={z} size="5 5" text="<<" action={actions.start} />,
        <Button pos={`${ppos.x - 9 - 2.5} ${ppos.y}`} z-index={z} size="5 5" text="<" action={actions.prev} />,
        <label pos={`${ppos.x} ${ppos.y - 2.5}`} z-index={z} size="10 5" text={text} halign="center" textfont="RobotoCondensed" textsize="1.2" valign="center2" />,
        <Button pos={`${ppos.x + 9 - 2.5} ${ppos.y}`} z-index={z} size="5 5" text=">" action={actions.next} />,
        <Button pos={`${ppos.x + 15 - 2.5} ${ppos.y}`} z-index={z} size="5 5" text=">>" action={actions.end} />,
    ];
}
