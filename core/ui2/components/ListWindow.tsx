import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment } from '@core/ui2/forge';
import DefaultWindow from './Window';
import DefaultDataTable from './DataTable';

export default function ListWindow() {
    const { data } = getProperties();

    const DataTable = getComponent('DataTable', DefaultDataTable);
    return <DataTable pos="0 0" usetitle={data.useTitle} data={data.datatable} />;
}
