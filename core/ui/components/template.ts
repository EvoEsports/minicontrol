/**
 * a basic template component that does nothing
 *
 * @param a attributes
 * @param inner inner content
 * @param obj object map
 *
 * @returns manialink replacement and script
 */
export default async (a: { [key: string]: any }) => {
    const [width, height] = a.size.split(" ").map((v: string) => parseFloat(v));
    const [posX, posY] = a.pos.split(" ").map((v: string) => parseFloat(v));

    let replacement =`<label pos="${a.pos}" size="${width} ${height}" text="Template Component" />`;
    let script= "";

    return { replacement, script};
}
