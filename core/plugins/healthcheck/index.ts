
import type { Socket, TCPSocketListener } from "bun";
import Plugin from "..";

export default class HealthCheck extends Plugin {
    socket: TCPSocketListener | null = null;

    async onLoad() {
        this.socket = Bun.listen({
            port: 3000,
            hostname: "127.0.0.1",
            socket: {
                error(error: any) {
                    tmc.cli(`¤error¤HealthCheck: ${error.message}`);
                },
                data(socket: Socket, data: Buffer) {
                    const message = data.toString("utf-8").trim();
                    if (message == "ping") {
                        // sends 0 if the service is healthy, 1 if it's not
                        socket.end(tmc.startComplete ? "0" : "1");
                        tmc.debug("¤info¤HealthCheck: Ping received.");
                    }
                },
                open(socket: Socket) {
                    tmc.debug("¤info¤HealthCheck: Connection opened.");
                }
            }
        });
    }

    async onUnload() {
        if (this.socket) {
            this.socket.stop();
            this.socket = null;
        }
    }
}