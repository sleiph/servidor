const { createUsuarioESala, loginUsuario } = require('./middleware/usuarioHelpers');

const express = require('express');
const cors = require('cors');

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

app.use(cors({
  origin: process.env.CORS_ORIGEM
}));

app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.APIKEY) {
    return res.status(403).json({ error: 'Proibido!!! Erro de autenticação.' });
  }
  next();
});

// API //

// READ (Select all)
app.get('/api/:entidade', async (req, res) => {
  const { entidade } = req.params;

  try {
    const result = await pool.query(`SELECT * FROM ${entidade}`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ (Select one por id)
app.get('/api/:entidade/:id', async (req, res) => {
  const { entidade, id } = req.params;

  try {
    const result = await pool.query(`SELECT * FROM ${entidade} WHERE id = $1`, [id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE
app.post('/api/:entidade', async (req, res) => {
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
app.put('/api/:entidade/:id', async (req, res) => {
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
app.delete('/api/:entidade/:id', async (req, res) => {
  const { entidade, id } = req.params;

  try {
    await pool.query(`DELETE FROM ${entidade} WHERE id = $1`, [id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PLANNING //

// CREATE usuario com sala
app.post('/planning/criarusuario', async (req, res) => {
  const userData = req.body;

  try {
    const result = await createUsuarioESala(userData);
    res.json({
      message: 'Usuario e sala criados com sucesso',
      usuario: result.usuario,
      sala: result.sala
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login usuario
app.post('/planning/login', async (req, res) => {
  const loginData = req.body;

  try {
    const usuario = await loginUsuario(loginData);
    res.json({
      message: 'Login realizado com sucesso',
      usuario: usuario
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.get('/planning/sala/:hash', async (req, res) => {
  const { hash } = req.params.sala;

  try {
    const result = await pool.query(`SELECT * FROM sala WHERE hash = $1`, [hash]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err); 
    res.status(500).json({ error: err.message });
  }
});

app.listen(porta, () => {
  console.log('API rodando em http://localhost:' + porta);
});
