import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment } from '@core/ui2/forge';
import DefaultDataTable from './DataTable';


export default function ListWindow() {
    const { pos, size, data, actions } = getProperties();

    const DataTable = getComponent('DataTable', DefaultDataTable);

    return (
        <>
            <DataTable pos="0 0" z-index={pos.z+1} usetitle={data.useTitle} data={data.datatable} />
        </>
    );
}
