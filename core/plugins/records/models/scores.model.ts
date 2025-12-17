import {
    Table,
    Column,
    Model,
    PrimaryKey,
    Unique,
    Index,
    DataType,
    NotNull,
    AllowNull,
    HasOne,
    ForeignKey,
    AutoIncrement,
} from "sequelize-typescript";
import Player from "@core/plugins/database/models/players.model";

@Table({ tableName: "scores", timestamps: true })
class Score extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column(DataType.STRING)
    declare mapUuid: string;

    @NotNull
    @AllowNull(false)
    @Column(DataType.STRING)
    @HasOne(() => Player, { as: "player", sourceKey: "login", foreignKey: "login" })
    declare login: string;
    player?: Player;

    @NotNull
    @AllowNull(false)
    @Column(DataType.INTEGER)
    declare time: number;

    @Column(DataType.STRING)
    declare checkpoints: string;

    @Column(DataType.VIRTUAL)
    declare rank: number | null;
}

export default Score;
