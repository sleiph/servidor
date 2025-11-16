const validaTabelas = require('./middleware/validaTabelas');

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

app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.APIKEY) {
    return res.status(403).json({ error: 'Proibido!!! Erro de autenticação.' });
  }
  next();
});

// READ (Select all)
app.get('/:entidade', validaTabelas, async (req, res) => {
  const { entidade } = req.params;

  try {
    const result = await pool.query(`SELECT * FROM ${entidade}`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ (Select one por id)
app.get('/:entidade/:id', validaTabelas, async (req, res) => {
  const { entidade, id } = req.params;

  try {
    const result = await pool.query(`SELECT * FROM ${entidade} WHERE id = $1`, [id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE
app.post('/:entidade', validaTabelas, async (req, res) => {
  const { entidade } = req.params;
  const dados = req.body;

  try {
    const keys = Object.keys(dados);
    const values = Object.values(dados);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const query = `INSERT INTO ${entidade} (${keys.join(', ')})
                   VALUES (${placeholders})
                   RETURNING *`;

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE (atributos por id)
app.put('/:entidade/:id', validaTabelas, async (req, res) => {
  const { entidade, id } = req.params;
  const dados = req.body;

  try {
    const keys = Object.keys(dados);
    const values = Object.values(dados);
    const setString = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

    const query = `UPDATE ${entidade} SET ${setString} WHERE id = $${keys.length + 1} RETURNING *`;

    const result = await pool.query(query, [...values, id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE (por id)
app.delete('/:entidade/:id', validaTabelas, async (req, res) => {
  const { entidade, id } = req.params;

  try {
    await pool.query(`DELETE FROM ${entidade} WHERE id = $1`, [id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(porta, () => {
  console.log('API rodando em http://localhost:' + porta);
});
