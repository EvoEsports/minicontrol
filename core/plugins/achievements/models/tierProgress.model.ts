import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AutoIncrement,
    DataType,
    NotNull,
    AllowNull,
} from "sequelize-typescript";

@Table({ tableName: "achievement_tiers", timestamps: true })
class TierProgress extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @NotNull
    @AllowNull(false)
    @Column(DataType.STRING)
    declare login: string;

    @NotNull
    @AllowNull(false)
    @Column(DataType.STRING)
    declare achievementId: string;

    @NotNull
    @AllowNull(false)
    @Column(DataType.STRING)
    declare tierId: string;

    @NotNull
    @AllowNull(false)
    @Column(DataType.INTEGER)
    declare tierIndex: number;

    @NotNull
    @AllowNull(false)
    @Column(DataType.BOOLEAN)
    declare unlocked: boolean;

    @AllowNull(true)
    @Column(DataType.DATE)
    declare unlockedAt?: Date;

    @NotNull
    @AllowNull(false)
    @Column(DataType.FLOAT)
    declare progressPercent: number;

    @NotNull
    @AllowNull(false)
    @Column(DataType.JSON)
    declare conditions: any;
}

export default TierProgress;
