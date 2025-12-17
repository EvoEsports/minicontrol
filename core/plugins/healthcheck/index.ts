import { Server, type Socket } from "node:net";
import Plugin from "..";
import { isDocker } from "@core/utils";

declare module "@core/plugins" {
    interface PluginRegistry {
        "healthcheck": HealthCheck;
    }
}

export default class HealthCheck extends Plugin {
    server: Server | null = null;

    async onLoad() {
        if (!isDocker()) {
            tmc.cli("¤info¤HealthCheck: disabled, docker not detected.");
            return;
        }
        tmc.cli("¤info¤HealthCheck: enabled, docker detected.");

        this.server = new Server((socket: Socket) => {
            socket.on("error", (error: any) => {
                tmc.cli(`¤error¤HealthCheck: ${error.message}`);
            });

            socket.on("data", (data: Buffer) => {
                const message = data.toString("utf-8").trim();
                if (message === "ping") {
                    // sends 0 if the service is healthy, 1 if it's not
                    socket.end(tmc.startComplete ? "0" : "1");
                    tmc.debug("¤info¤HealthCheck: Ping received.");
                }
            });

            socket.on("open", () => {
                tmc.debug("¤info¤HealthCheck: Connection opened.");
            });
        });

        this.server.listen(3000);
    }

    async onUnload() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}
