"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
const pg_1 = __importDefault(require("pg"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config();
// Connect to the database using the DATABASE_URL environment
//   variable injected by Railway
const pool = new pg_1.default.Pool();
const app = (0, express_1.default)();
const port = process.env.PORT || 3333;
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.raw({ type: "application/vnd.custom-type" }));
app.use(body_parser_1.default.text({ type: "text/html" }));
app.use((0, cors_1.default)());
//
app.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { rows } = yield pool.query("SELECT NOW()");
    res.send(`Hello, World! The time from the DB is ${rows[0].now}`);
}));
let clientData = [];
let sequence = 1;
app.get('/sse', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    addSSEClient(req, res);
});
function addSSEClient(req, res) {
    req.on('close', () => clientData = clientData.filter(o => o.res !== res));
    clientData.push({
        res,
        clientNo: sequence++,
        messageNo: 1
    });
    if (clientData.length === 0 || clientData.length === 1) {
        console.log("client atached");
        setTimeout(send);
    }
}
function send() {
    console.log('data sended');
    clientData.forEach(o => {
        const data = JSON.stringify({
            clientCount: clientData.length,
            clientNo: o.clientNo,
            messageNo: o.messageNo++
        });
        o.res.write(`data: ${data}\n\n`);
    });
    setTimeout(() => {
        if (clientData.length === 0) {
            console.log("iterations stopped");
        }
        else {
            send();
        }
    }, 1000);
}
//
app.get("/api/consumer", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const filePath = path_1.default.join(__dirname, 'index.html');
    res.sendFile(filePath);
}));
// Maintain a list of connected clients
const clients = new Set();
app.get("/api/clients", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.send(`Hello, World! There are ${clients.size} clients connected`);
}));
const httpServer = app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
const ws_1 = __importDefault(require("ws"));
const wsServer = new ws_1.default.Server({ noServer: true });
httpServer.on('upgrade', (req, socket, head) => {
    console.log("new connection");
    wsServer.handleUpgrade(req, socket, head, (ws) => {
        clients.add(ws);
        wsServer.emit('connection', ws, req);
    });
});
wsServer.on('connection', (ws, request) => {
    const protocol = request.headers['sec-websocket-protocol'];
    console.log(`WebSocket client connected with protocol: ${protocol}`);
    ws.send(`WebSocket client connected with protocol: ${protocol}`);
    ws.on('message', (message) => {
        console.log('Received message:', message.toString());
        // Broadcast the message to all connected clients
        clients.forEach((client) => {
            if (client.readyState === ws_1.default.OPEN) {
                client.send(`Client said: ${message}`);
            }
        });
        // Send a response to the client based on the protocol used
        if (protocol === null || protocol === void 0 ? void 0 : protocol.includes('ordersSender')) {
            clients.forEach((client) => {
                if (client.readyState === ws_1.default.OPEN) {
                    if (client.protocol === 'ordersReciever') {
                        client.send(`ordersSender said: ${message}`);
                    }
                }
            });
        }
        else if (protocol === null || protocol === void 0 ? void 0 : protocol.includes('ordersReciever')) {
            clients.forEach((client) => {
                if (client.readyState === ws_1.default.OPEN) {
                    if (client.protocol === 'ordersSender') {
                        client.send(`ordersReciever said: ${message}`);
                    }
                }
            });
        }
    });
    ws.on('close', () => {
        // Remove the client from the list of connected clients
        clients.delete(ws);
    });
});
