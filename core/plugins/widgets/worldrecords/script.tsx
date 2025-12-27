import DefaultWidgetTitle from '@core/ui/components/partials/WidgetTitle';
import DefaultRecordItem from '@core/ui/components/partials/RecordItem';
import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment } from '@core/ui/forge';

export default function ScriptThing() {
    const { pos, colors } = getProperties();
    const WidgetTitle = getComponent('WidgetTitle', DefaultWidgetTitle);
    const RecordItem = getComponent('RecordItem', DefaultRecordItem);
    const items: any = [];
    for (let i = 0; i < 8; i++) {
        items.push(<RecordItem id={`r_${i}`} rank={i + 1} pos={`0 -${6 + i * 3.5}`} size="38 4" />);
    }

    return (
        <>
            <frame pos={`${pos.x} ${pos.y}`}>
                <WidgetTitle pos="0 0" size="38 5" text="WORLD RECORDS" />
                {items}
            </frame>

            <script>
                {maniascriptFragment(`
#Include "TextLib" as TextLib
#Include "Libs/Nadeo/TMGame/Modes/Base/UIModules/Record_Common.Script.txt" as Record
#Include "Libs/Nadeo/CMGame/Utils/Http.Script.txt" as Http
#Include "Libs/Nadeo/CMGame/Utils/Privileges.Script.txt" as Privileges
#Include "Libs/Nadeo/CMGame/Utils/Task.Script.txt" as Task
#Include "Libs/Nadeo/TMGame/Modes/Base/UIModules/Record_Common.Script.txt" as Record
#Include "Libs/Nadeo/Trackmania/API/LeaderboardAPI.Script.txt" as LeaderboardAPI


#Const C_RecordStatus_Loading 0
#Const C_RecordStatus_Loaded 1
#Const C_RecordStatus_Followed 2
#Const C_ForceMedalScope "PersonalBest"
#Const C_ForceRecordScope "PersonalBest"


#Struct K_Celebration {
	Boolean IsActive;
	Integer PrevScore;
	Integer BestScore;
	Integer PrevMedal;
	Integer BestMedal;
}

#Struct K_RecordGhost {
	Text AccountId;
	Integer Medal;
	Ident GhostId;
	Ident GhostInstanceId;
	Task::K_Task Task_RetrieveGhost;
	Task::K_Task Task_RetrieveRecords;
}


#Struct K_State {
	Integer SetupUpdate;
	Integer ForceMapUpdate;
	Boolean ReloadRecords;
	Boolean PBGhostEnabled;
	Boolean DisplayPBGhost;
	Boolean MedalEnabled;
	Boolean CelebratePB;
	Boolean CelebrateMedal;
	Text CurrentMapUid;
	Ident TaskIdGetRecordGhost;
	Ident PBGhostId;
	Ident PBGhostInstanceId;
	Ident PBCpSyncedGhostInstanceId;
	Text ScopeSeason;
	Text ScopeNotSeason;
	Text ModeName;
	Text CustomData;
	Text[Text] SeasonIds;
	Boolean RequestCelebration;
	K_Celebration Celebration;
	Integer CurrentMedal;
	Boolean RecordsEnabled;
	Integer MapAvailaibleOnNadeoServices;
	Task::K_Task Task_GetMapFromUid;
	Boolean PlayerIsDisplayingRecords;
	Integer RecordsSelectedZone;
	Integer RecordsPlayerTime;
	Integer RecordsServerUpdate;
	Integer[] RecordsAreDirty;
	Integer[] RecordsNeedInit;
	Boolean RequestRecordsInProgress;
	Integer[] RecordsErrorCodes;
	Http::K_Request RequestZonesTopRecords;
	Http::K_Request RequestZonesSurroundingRecords;
	Http::K_Request RequestClubTopRecords;
	Http::K_Request RequestClubSurroundingRecords;
	Http::K_Request RequestClubVIPList;
	Http::K_Request RequestGlobalVIPList;
	Task::K_Task Task_GetClubVIPRecords;
	Task::K_Task Task_GetGlobalVIPRecords;
	CUserV2Profile::EDisplayRecords RecordsVisibilityFromSettings;
	LeaderboardAPI::K_ResponseFromGetMapTopRankings ResponseZonesTopRecords;
	LeaderboardAPI::K_ResponseFromGetSurroundingRankings ResponseZonesSurroundingRecords;
	LeaderboardAPI::K_ResponseFromGetMapTopRankingsInClub ResponseClubTopRecords;
	LeaderboardAPI::K_ResponseFromGetMapSurroundingRankingsInClub ResponseClubSurroundingRecords;
	Integer[Text] ResponseClubVIPRecords;
	Integer[Text] ResponseGlobalVIPRecords;
	Boolean LoadingRecords;
	Text RecordsLoadedForMapUid;
	Text RecordsLoadingForMapUid;
	Ident TaskIdRetrieveDisplayName;
	Integer RecordsClubId;
	Text RecordsClubName;
	Record::K_TMGame_Record_Records[] ZonesRecords;
	K_RecordGhost[Text] LoadingRecordGhosts;
	K_RecordGhost[Text] LoadedRecordGhosts;
	K_RecordGhost SpectatorTargetRecordGhost;
	Boolean ManialinkIsInitialized;
	Boolean CanViewLeaderboards;
	Privileges::K_PrivilegeCheck LeaderboardPrivilegeCheck;
}

#Struct K_Scope {
	Text Type;
	Text Id;
}

K_Scope GetScope(K_State _State) {
	declare K_Scope Scope = K_Scope {
		Type = _State.ScopeNotSeason,
		Id = ""
	};
	if (_State.SeasonIds.existskey(_State.CurrentMapUid)) {
		Scope.Type = _State.ScopeSeason;
		Scope.Id = _State.SeasonIds[_State.CurrentMapUid];
	}
	return Scope;
}

Void SendPBGhostVisibilityToModeAndML(K_State _State) {
    declare netwrite Boolean Net_TMGame_Record_PBGhostIsVisible for UI;
    declare Boolean TMGame_Record_PBGhostIsVisible for ClientUI;
    Net_TMGame_Record_PBGhostIsVisible = _State.DisplayPBGhost || (_State.SpectatorTargetRecordGhost.AccountId == "" && _State.LoadedRecordGhosts.count <= 0);
    TMGame_Record_PBGhostIsVisible = Net_TMGame_Record_PBGhostIsVisible;
    SendCustomEvent("TMGame_Record_UpdatePBGhostVisibility", [""^Net_TMGame_Record_PBGhostIsVisible]);
}

Void SendRecordsStatusToML(K_State _State) {
    declare Integer[Text] TMGame_Record_RecordsStatus for ClientUI;
    declare Integer TMGame_Record_RecordsStatusUpdate for ClientUI;

    TMGame_Record_RecordsStatus = [];

    foreach (AccountId => Record in _State.LoadingRecordGhosts) {
        TMGame_Record_RecordsStatus[AccountId] = C_RecordStatus_Loading;
    }
    foreach (AccountId => Record in _State.LoadedRecordGhosts) {
        TMGame_Record_RecordsStatus[AccountId] = C_RecordStatus_Loaded;
    }
    if (_State.SpectatorTargetRecordGhost.AccountId != "") {
        TMGame_Record_RecordsStatus[_State.SpectatorTargetRecordGhost.AccountId] = C_RecordStatus_Followed;
    }

    TMGame_Record_RecordsStatusUpdate += 1;
}

Ident GetMainUserId() {
	declare Ident LibMainUser_MainUserId for System = NullId;
	return LibMainUser_MainUserId;
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
/// Set the main user id
Void SetMainUserId(Ident _MainUserId) {
	declare Ident LibMainUser_MainUserId for System = NullId;
	LibMainUser_MainUserId = _MainUserId;
}

K_State DisplayPBGhost(K_State _State, Boolean _DisplayPBGhost) {
    declare K_State State = _State;
    State.DisplayPBGhost = _DisplayPBGhost;
    SendPBGhostVisibilityToModeAndML(State);
    return State;
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
/// Release record ghost data
K_State ReleaseRecordGhost(K_State _State, Text _AccountId) {
    declare K_State State = _State;

    declare K_RecordGhost[] Records;
    if (State.LoadingRecordGhosts.existskey(_AccountId)) Records.add(State.LoadingRecordGhosts[_AccountId]);
    if (State.LoadedRecordGhosts.existskey(_AccountId)) Records.add(State.LoadedRecordGhosts[_AccountId]);

     foreach (Record in Records) {
     	Task::Destroy(Record.Task_RetrieveRecords);
     	Task::Destroy(Record.Task_RetrieveGhost);
     	// if (Record.GhostInstanceId != NullId) {
     	// 	// GhostMgr.Ghost_Remove(Record.GhostInstanceId);
     	// }
     	// if (Record.GhostId != NullId && DataFileMgr.Ghosts.existskey(Record.GhostId)) {
     	// 	DataFileMgr.Ghost_Release(Record.GhostId);
     	// }
     }

    State.LoadingRecordGhosts.removekey(_AccountId);
    State.LoadedRecordGhosts.removekey(_AccountId);

    State = DisplayPBGhost(State, State.DisplayPBGhost);

    return State;
}

K_State ReleaseAllRecordGhosts(K_State _State) {
    declare K_State State = _State;

    declare TmpLoadingRecordGhosts = State.LoadingRecordGhosts;
    foreach (AccountId => Record in TmpLoadingRecordGhosts) {
        State = ReleaseRecordGhost(State, AccountId);
    }
    State.LoadingRecordGhosts = [];

    declare TmpLoadedRecordGhosts = State.LoadedRecordGhosts;
    foreach (AccountId => Record in TmpLoadedRecordGhosts) {
        State = ReleaseRecordGhost(State, AccountId);
    }
    State.LoadedRecordGhosts = [];

    SendRecordsStatusToML(State);
    State = DisplayPBGhost(State, State.DisplayPBGhost);

    return State;
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
/// Retrieve a player record ghost
K_State RetrieveRecordGhost(K_State _State, Text _AccountId) {
    declare K_State State = _State;

    // Release previous record if any
    State = ReleaseRecordGhost(State, _AccountId);

    declare K_RecordGhost Record = K_RecordGhost {
        AccountId = _AccountId
    };
    declare K_Scope Scope;
    if (C_ForceRecordScope != "") {
        Scope = K_Scope {
            Type = C_ForceRecordScope,
            Id = ""
        };
    } else {
        Scope = GetScope(_State);
    }

    Record.Task_RetrieveRecords = Task::DestroyAndCreate(
        Record.Task_RetrieveRecords,
        ScoreMgr,
        ScoreMgr.Map_GetPlayerListRecordList(GetMainUserId(), [Record.AccountId], State.CurrentMapUid, Scope.Type, Scope.Id, State.ModeName, State.CustomData)
     );

    State.LoadingRecordGhosts[Record.AccountId] = Record;
    SendRecordsStatusToML(State);

    return State;
}

Void ToggleGhost(Text AccountId) {
    declare K_State TMGame_Record_State for UI;
    if (TMGame_Record_State.LoadedRecordGhosts.existskey(AccountId)) {
        TMGame_Record_State = ReleaseRecordGhost(TMGame_Record_State, AccountId);
        SendRecordsStatusToML(TMGame_Record_State);
    } else {
        TMGame_Record_State = RetrieveRecordGhost(TMGame_Record_State, AccountId);
    }
}

main() {
    declare K_State TMGame_Record_State for UI;
    declare oldCount = -1;
    //ToggleGhost("1c17a5db-accf-457e-a7ce-c3cd86defbc1");
    //ToggleGhost("11d6f37c-b5cc-4bf6-88fc-f8d90956b281"); // reaby

   // log(TMGame_Record_State.ZonesRecords[0].Records);

    while(True) {
        yield;
        if (TMGame_Record_State.ZonesRecords.count == 0) {
            continue;
        }
        if (oldCount != TMGame_Record_State.ZonesRecords[0].Records.count) {
            oldCount == TMGame_Record_State.ZonesRecords[0].Records.count;
            for(Idx, 0, 7) {
                declare Item <=> (Page.GetFirstChild("r_"^Idx) as CMlFrame);
                (Item.Controls[4] as CMlQuad).BgColor = TextLib::ToColor("000");
                (Item.Controls[5] as CMlQuad).BgColor = TextLib::ToColor("000");
                Item.Hide();
            }
            if (TMGame_Record_State.ZonesRecords[0].Records.count < 1) {
                continue;
            }

            foreach(Idx => Record in TMGame_Record_State.ZonesRecords[0].Records) {
                declare Item <=> (Page.GetFirstChild("r_"^Idx) as CMlFrame);
                Item.Show();
                (Item.Controls[1] as CMlLabel).Value = TextLib::Replace(TextLib::FormatRank(Record.Rank, True), "th", "");
                (Item.Controls[2] as CMlLabel).Value = Record.DisplayName;
                (Item.Controls[3] as CMlLabel).Value = TextLib::TimeToText(Record.Score, True, True);
                if (Record.AccountId == LocalUser.WebServicesUserId) {
                    (Item.Controls[4] as CMlQuad).BgColor = TextLib::ToColor("${colors.highlight}");
                    (Item.Controls[5] as CMlQuad).BgColor = TextLib::ToColor("${colors.highlight}");
                }
            }

        }
    }
}

        `)}
            </script>
        </>
    );
}
