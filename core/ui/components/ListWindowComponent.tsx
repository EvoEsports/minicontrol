import { createElement, Fragment, getProperties, maniascriptFragment } from '@core/ui/forge';
import DefaultDataTable from './DataTable';
import ComponentRegistry from '../componentregistry';

export default function ListWindow() {
    const { data, actions } = getProperties();

    const DataTable = ComponentRegistry.get('DataTable', DefaultDataTable);

    return (
        <>
            <DataTable pos="0 0" z-index="1" usetitle={data.useTitle} data={data.datatable} />
        </>
    );
}
