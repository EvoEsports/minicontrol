import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment } from '@core/ui2/forge';
import DefaultDataTable from './DataTable';
import DefaultButton from './Button';

export default function ListWindow() {
    const { pos, size, data, actions } = getProperties();

    const DataTable = getComponent('DataTable', DefaultDataTable);
    const Button = getComponent('Button', DefaultButton);
    let applyButtons:any = [];

    if (data.applyButtons) {
        applyButtons.push(<Button pos={`${size.width - 47} -${size.height - 11}`} z-index={pos.z} size="20 5" halign="center" text="Apply" action={actions.apply} />);
        applyButtons.push(<Button pos={`${size.width - 25} -${size.height - 11}`} z-index={pos.z} size="20 5" halign="center" text="Cancel" action={actions.close} />);
    }

    return (
        <>
            <DataTable pos="0 0" z-index={pos.z+1} usetitle={data.useTitle} data={data.datatable} />
            {applyButtons}
        </>
    );
}
