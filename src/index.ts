import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import pg from "pg";
import path from "path";

import dotenv from "dotenv";
import cors from 'cors'
dotenv.config()

// Connect to the database using the DATABASE_URL environment
//   variable injected by Railway
const pool = new pg.Pool();

const app = express();
const port = process.env.PORT || 3333;

app.use(bodyParser.json());
app.use(bodyParser.raw({ type: "application/vnd.custom-type" }));
app.use(bodyParser.text({ type: "text/html" }));
app.use(cors())

//

app.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT NOW()");
  res.send(`Hello, World! The time from the DB is ${rows[0].now}`);
});


let clientData: { res: Response, clientNo: number, messageNo: number }[] = [];
let sequence = 1;

app.get('/sse', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  addSSEClient(req, res);
});

function addSSEClient(req: Request, res: Response) {
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
    } else {
      send()
    }
  }, 1000);
}

//


app.get("/api/sender", async (req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  res.sendFile(filePath);
});

app.get("/api/reciever", async (req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  res.sendFile(filePath);
});

// Maintain a list of connected clients
const clients = new Set<WebSocket>();

const clientsMap = new Map<string, Set<WebSocket>>();

function broadcastToClientsByProtocol(protocol: string, message: string) {
  const clientSet = clientsMap.get(protocol);
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

import { IncomingMessage } from "http";

function handleNewConnection(ws: WebSocket, request: IncomingMessage) {
  const protocol = request.headers['sec-websocket-protocol'];

  if (!protocol) {
    ws.close(404, "No protocol specified");
    console.log('No protocol specified');
    return;
  }

  let clientSet = clientsMap.get(protocol);

  if (!clientSet) {
    clientSet = new Set<WebSocket>();
    clientsMap.set(protocol, clientSet);
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

  ws.on('close', () => {
    // Remove the client from the list of connected clients
    const clientSet = clientsMap.get(protocol);
    if (clientSet) {
      clientSet.delete(ws);
      if (clientSet.size === 0) {
        clientsMap.delete(protocol);
      }
    }
  });
}

app.get("/api/clients", async (req, res) => {
  res.send(`clientsMap:${clientsMap.size}  ${(clientsMap.get('ordersSender') || { size: -1 }).size}')}`);
});

const httpServer = app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

import WebSocket from "ws";

const wsServer = new WebSocket.Server({ noServer: true })

wsServer.on('connection', handleNewConnection);

httpServer.on('upgrade', (req, socket, head) => {
  console.log("new connection");
  wsServer.handleUpgrade(req, socket, head, (ws) => {
    wsServer.emit('connection', ws, req);
  });
});

/* httpServer.on('upgrade', (req, socket, head) => {
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
      if (client.readyState === WebSocket.OPEN) {
        client.send(`Client said: ${message}`);
      }
    });


    // Send a response to the client based on the protocol used
    if (protocol?.includes('ordersSender')) {
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          if (client.protocol === 'ordersReciever') {
            client.send(`ordersSender said: ${message}`);
          }
        }
      })
    } else if (protocol?.includes('ordersReciever')) {
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          if (client.protocol === 'ordersSender') {
            client.send(`ordersReciever said: ${message}`);
          }
        }
      })
    }

  });

  ws.on('close', () => {
    // Remove the client from the list of connected clients
    clients.delete(ws);
  });
}); */
