import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui/forge';
import DefaultRecordItem from '@core/ui/components/partials/RecordItem';
import DefaultTitle from '@core/ui/components/partials/WidgetTitle';

export default function WidgetComponent() {
    const { pos, size, data, actions, colors, recipient } = getProperties();
    const { width, height } = size;
    const RecordItem = getComponent('RecordItem', DefaultRecordItem);
    const WidgetTitle = getComponent('WidgetTitle', DefaultTitle);
    const first = data.records[0]?.time || 0;

    const records = data.records.map((record, i) => (
        <RecordItem
            pos={`0 -${i * 4.5}`}
            size={`${width} 4`}
            z-index={pos.z + 1}
            rank={record.rank}
            nickname={record.player?.customNick || record.player?.nickname || 'asd'}
            time={record.rank==1?record.time:Math.abs(first-record.time)}
            highlight={record.login == recipient}
        />
    ));

    return (
        <>
            <WidgetTitle text="RECORDS" />
            <frame pos="0 -6">{records}</frame>
        </>
    );
}
