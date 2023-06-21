import bodyParser from "body-parser";
import express from "express";

import dotenv from "dotenv";
import cors from 'cors'
dotenv.config()


const App = express();
const port = process.env.PORT || 3333;

App.use(bodyParser.json());
App.use(bodyParser.raw({ type: "application/vnd.custom-type" }));
App.use(bodyParser.text({ type: "text/html" }));
App.use(cors())

export const httpServer = App.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

export default App;