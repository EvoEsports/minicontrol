import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment } from '@core/ui2/forge';
import DefaultWindow from './Window';
import DefaultDataTable from './DataTable';

export default function ListWindow() {
    const props = getProperties();
    const data = props.data;

    const Window = getComponent('Window', DefaultWindow);
    const DataTable = getComponent('DataTable', DefaultDataTable);
    return (
        <Window title={data.title} size={props.size}>
            <DataTable pos="0 0" data={data.datatable} />
        </Window>
    );
}
