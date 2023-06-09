import bodyParser from "body-parser";
import express from "express";
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

app.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT NOW()");
  res.send(`Hello, World! The time from the DB is ${rows[0].now}`);
});

app.get("/api/consumer", async (req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  res.sendFile(filePath);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

import WebSocket from "ws";
const wss = new WebSocket.Server({ port: 4200 });

wss.on('connection', (ws) => {
  console.log("new connection")
  ws.on('message', (message) => {
    console.log('Received message:', message.toString());
    ws.send(`You said: ${message}`);
  });
})
