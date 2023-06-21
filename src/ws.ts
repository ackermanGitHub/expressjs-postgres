import WebSocket from "ws";
import { httpServer } from "./app";
import ClientsMap from "./data";
import { IncomingMessage } from "http";

const wsServer = new WebSocket.Server({ noServer: true })

wsServer.on('connection', handleNewConnection);

httpServer.on('upgrade', (req, socket, head) => {
    wsServer.handleUpgrade(req, socket, head, (ws) => {
        wsServer.emit('connection', ws, req);
    });
});

function handleNewConnection(ws: WebSocket, request: IncomingMessage) {
    const protocol = request.headers['sec-websocket-protocol'];

    if (!protocol) {
        ws.close(404, "No protocol specified");
        console.log('No protocol specified');
        return;
    }

    let clientSet = ClientsMap.get(protocol);

    if (!clientSet) {
        clientSet = new Set<WebSocket>();
        ClientsMap.set(protocol, clientSet);
    }
    clientSet.add(ws);

    console.log(`WebSocket client connected with protocol: ${protocol}`);
    ws.send(`WebSocket client connected with protocol: ${protocol}`);

    ws.on('message', (message) => {
        console.log('Received message:', message.toString());

        // Broadcast the message to all connected clients
        broadcastToClientsByProtocol(protocol, `Client said: ${message}`);

        // Send a response to the client based on the protocol used
        if (protocol === 'ordersSender') {
            broadcastToClientsByProtocol('ordersReciever', `ordersSender said: ${message}`);
        } else if (protocol === 'ordersReciever') {
            broadcastToClientsByProtocol('ordersSender', `ordersReciever said: ${message}`);
        }
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error: ${error}`);
        // Remove the client from the list of connected clients
        const clientSet = ClientsMap.get(protocol);
        if (clientSet) {
            clientSet.delete(ws);
            if (clientSet.size === 0) {
                ClientsMap.delete(protocol);
            }
        }
    });

    ws.on('close', () => {
        // Remove the client from the list of connected clients
        const clientSet = ClientsMap.get(protocol);
        if (clientSet) {
            clientSet.delete(ws);
            if (clientSet.size === 0) {
                ClientsMap.delete(protocol);
            }
        }
    });
}

function broadcastToClientsByProtocol(protocol: string, message: string) {
    const clientSet = ClientsMap.get(protocol);
    if (clientSet) {
        clientSet.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    } else {
        console.log(`No clients connected with protocol: ${protocol}`);
    }
}