import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment } from '@core/ui2/forge';
import Button from '../Button';

export default function PaginateControls(props: any) {
    const { pos, data } = props || {};
    const [posX, posY] = pos?.split(' ').map((v: string) => parseFloat(v)) || [0, 0];

    const dataProps = getProperties();
    const actions = dataProps.actions;
    const out: any = [];
    const text = data.pageNb + 1 + ' / ' + Math.ceil(data.items.length / data.pageSize);

    out.push(<Button pos={`${posX - 15 - 2.5} ${posY}`} size="5 5" text="<<" action={actions.start} />);
    out.push(<Button pos={`${posX - 9 - 2.5} ${posY}`} size="5 5" text="<" action={actions.prev} />);
    out.push(<label pos={`${posX } ${posY - 2.5}`} size="10 5" text={text} halign="center" textfont="RobotoCondensed" textsize="1.2" valign="center2" />);
    out.push(<Button pos={`${posX + 9 - 2.5} ${posY}`} size="5 5" text=">" action={actions.next} />);
    out.push(<Button pos={`${posX + 15 - 2.5} ${posY}`} size="5 5" text=">>" action={actions.end} />);

    return out;
}
