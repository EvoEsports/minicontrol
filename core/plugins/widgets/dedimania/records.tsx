import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui2/forge';
import DefaultRecordItem from '@core/ui2/components/partials/RecordItem';
import DefaultTitle from '@core/ui2/components/partials/WidgetTitle';

export default function WidgetComponent() {
    const { pos, size, data, actions, colors } = getProperties();
    const { width, height } = size;
    const RecordItem = getComponent('RecordItem', DefaultRecordItem);
    const WidgetTitle = getComponent('WidgetTitle', DefaultTitle);

    const records = data.records.map((record, i) => (
        <RecordItem
            pos={`0 -${i * 3}`}
            size={`${width} 3`}
            z-index={pos.z + 1}
            rank={record.rank}
            nickname={record.nickname}
            time={record.time}
            highlight={record.login == data.login}
        />
    ));

    return (
        <>
            <WidgetTitle text={data.title} />
            <frame pos="0 -6" z-index="1">{records}</frame>
        </>
    );
}
