export default abstract class Plugin {
    depends: string[] = [];

    async onLoad() {
        return;
    }

    async onUnload() {
        return;
    }

    async onStart() {
        return;
    }
}