import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui2/forge';
import Button from '../Button';

export default function PaginateControls({ pos = '0 0', data }) {
    const ppos = vec2(pos);
    const { actions } = getProperties();

    const out: any = [];
    const text = data.pageNb + 1 + ' / ' + Math.ceil(data.items.length / data.pageSize);

    out.push(<Button pos={`${ppos.x - 15 - 2.5} ${ppos.y}`} size="5 5" text="<<" action={actions.start} />);
    out.push(<Button pos={`${ppos.x - 9 - 2.5} ${ppos.y}`} size="5 5" text="<" action={actions.prev} />);
    out.push(<label pos={`${ppos.x} ${ppos.y - 2.5}`} size="10 5" text={text} halign="center" textfont="RobotoCondensed" textsize="1.2" valign="center2" />);
    out.push(<Button pos={`${ppos.x + 9 - 2.5} ${ppos.y}`} size="5 5" text=">" action={actions.next} />);
    out.push(<Button pos={`${ppos.x + 15 - 2.5} ${ppos.y}`} size="5 5" text=">>" action={actions.end} />);

    return out;
}
