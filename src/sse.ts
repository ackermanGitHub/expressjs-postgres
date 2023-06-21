import App from "./app";
import { Request, Response } from "express";


let clientData: { res: Response, clientNo: number, messageNo: number }[] = [];
let sequence = 1;

App.get('/sse', (req, res) => {
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