
import { Table, Column, Model, HasMany, PrimaryKey, Unique, Index, DataType, NotNull, AllowNull } from 'sequelize-typescript';

@Table({ tableName: "maps", timestamps: true })
// biome-ignore lint/suspicious/noShadowRestrictedNames: <explanation>
class Map extends Model {
    @PrimaryKey
    @Unique
    @Column(DataType.STRING)
    uuid: string | undefined;

    @NotNull
    @AllowNull(false)
    @Column(DataType.STRING)
    name: string | undefined;

    @NotNull
    @AllowNull(false)
    @Column(DataType.STRING)
    author: string |undefined;

    @Column(DataType.STRING)
    authorNickname?: string | null;

    @NotNull
    @AllowNull(false)
    @Column(DataType.INTEGER)
    authorTime: number |undefined;

    @Column(DataType.STRING)
    environment?: string | null;

    @AllowNull(true)
    @Column(DataType.STRING)
    playerModel?: string | null;

    @AllowNull(true)
    @Column(DataType.DATE)
    lastPlayed?: Date | null;

    @AllowNull(true)
    @Column(DataType.STRING)
    tmxId?: string | null;

}

export default Map;
