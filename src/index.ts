import App from "./app";
import path from "path";
import { pool } from "./db";
import ClientsMap from "./data";
import './ws'

App.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT NOW()");
  res.send(`Hello, World! The time from the DB is ${rows[0].now}`);
});

App.get('/stores', async (req, res) => {
  const { user_id } = req.query;
  try {
    const stores = await pool.query(`SELECT * FROM store WHERE user_id = $1`, [user_id]);
    res.json(stores.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

App.post('/store', async (req, res) => {
  const { user_id, name, address, city, state, zipcode } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO store (user_id, name, address, city, state, zipcode) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [user_id, name, address, city, state, zipcode]
    );
    res.json(result.rows[0]);
    console.log(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

App.delete('/store', async (req, res) => {
  const { store_id } = req.body;
  try {
    const result = await pool.query(
      'DELETE FROM store WHERE id = $1',
      [store_id]
    );
    res.json(result.rows[0]);
    console.log(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});



App.get("/api/sender", async (req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  res.sendFile(filePath);
});

App.get("/api/reciever", async (req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  res.sendFile(filePath);
});

App.get("/api/clients", async (req, res) => {
  res.send({
    clientsMap: {
      size: ClientsMap.size,
      keys: Array.from(ClientsMap.keys()),
    },
    ordersSendersSet: {
      size: ClientsMap.get('ordersSender')?.size,
    },
    ordersRecieversSet: {
      size: ClientsMap.get('ordersReciever')?.size,
    }
  });
});