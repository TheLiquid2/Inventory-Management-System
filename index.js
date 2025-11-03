require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

//List products
app.get('/api/products', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM Product ORDER BY product_id');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

//Get product
app.get('/api/products/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const { rows } = await pool.query('SELECT * FROM Product WHERE product_id=$1', [id]);
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

//Create product
app.post('/api/products', async (req, res) => {
  const { name, category, price=0.0, quantity_in_stock=0 } = req.body;
  try {
    const q = `INSERT INTO Product (name, category, price, quantity_in_stock)
               VALUES ($1,$2,$3,$4) RETURNING *`;
    const { rows } = await pool.query(q, [name, category, price, quantity_in_stock]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

//Update product
app.put('/api/products/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, category, price, quantity_in_stock } = req.body;
  try {
    const q = `UPDATE Product SET name=$1, category=$2, price=$3, quantity_in_stock=$4, updated_at=NOW()
               WHERE product_id=$5 RETURNING *`;
    const { rows } = await pool.query(q, [name, category, price, quantity_in_stock, id]);
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

//Delete product
app.delete('/api/products/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await pool.query('DELETE FROM Product WHERE product_id=$1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});


//Create Product Orders with lines in a transaction
app.post('/api/pos', async (req, res) => {
  const { vendor_id, order_date, status='Draft', notes='', total_amount=0.0, lines=[] } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const poInsert = `INSERT INTO Purchase_Order (vendor_id, order_date, status, notes, total_amount)
                      VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    const { rows: poRows } = await client.query(poInsert, [vendor_id, order_date, status, notes, total_amount]);
    const po = poRows[0];

    const insertLineQ = `INSERT INTO Purchase_Order_Line (po_id, product_id, quantity, unit_price)
                         VALUES ($1,$2,$3,$4) RETURNING *`;
    for (const ln of lines) {
      await client.query(insertLineQ, [po.po_id, ln.product_id, ln.quantity, ln.unit_price]);
    }

    await client.query('COMMIT');
    res.status(201).json(po);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create PO' });
  } finally {
    client.release();
  }
});

//Receive Product Orders
app.post('/api/pos/:id/receive', async (req, res) => {
  const poId = parseInt(req.params.id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // set Product Orders received
    await client.query('UPDATE Purchase_Order SET status=$1, updated_at=NOW() WHERE po_id=$2',
                       ['Received', poId]);

    // get lines
    const { rows: lines } = await client.query('SELECT product_id, quantity FROM Purchase_Order_Line WHERE po_id=$1', [poId]);

    // update products
    for (const l of lines) {
      await client.query('UPDATE Product SET quantity_in_stock = quantity_in_stock + $1 WHERE product_id = $2',
                         [l.quantity, l.product_id]);
    }

    await client.query('COMMIT');
    res.json({ ok: true, applied: lines.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to receive PO' });
  } finally {
    client.release();
  }
});