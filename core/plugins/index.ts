export default abstract class Plugin {  
    depends: string[] = [];

    onLoad(): Promise<void> {
        return Promise.resolve();
    }
    
    onUnload(): Promise<void> {
        return Promise.resolve();
    }

    onStart(): Promise<void> {
        return Promise.resolve();
    }
}