const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json());

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

const porta = process.env.APPPORT;

// READ (Select all)
app.get('/cartas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM carta');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE (Insert)
app.post('/cartas', async (req, res) => {
  const carta = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO carta (valor, naipe, cima, baixo) VALUES ($1, $2, $3, $4) RETURNING *',
      [carta.valor, carta.naipe, carta.cima, carta.baixo]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE cima
app.put('/cartas/cima/:id', async (req, res) => {
  const { id } = req.params;
  const { cima } = req.body;
  try {
    const result = await pool.query(
      'UPDATE carta SET cima = $1 WHERE id = $2 RETURNING *',
      [cima, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE cima
app.put('/cartas/baixo/:id', async (req, res) => {
  const { id } = req.params;
  const { baixo } = req.body;
  try {
    const result = await pool.query(
      'UPDATE carta SET baixo = $1 WHERE id = $2 RETURNING *',
      [baixo, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
app.delete('/cartas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM carta WHERE id = $1', [id]);
    res.json({ message: 'Carta deletada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(porta, () => {
  console.log('API rodando em http://localhost:' + porta);
});
