const crypto = require('crypto');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

/**
 * 
 * @returns hash unica de 32 characteres
 */
function generateUniqueHash() {
  return crypto.randomBytes(16).toString('hex');
}

async function criaSala() {
  const salaHash = generateUniqueHash();

  const salaResult = await pool.query(
    'INSERT INTO sala (hash) VALUES ($1) RETURNING *',
    [salaHash]
  );

  return salaResult.rows[0];
}

/**
 * 
 * @param {*} senha 
 * @returns senha hasheada
 */
function hashPassword(senha) {
  return crypto.createHash('sha256').update(senha).digest('hex');
}

async function createUsuarioESala(userData) {
  const { nome, senha } = userData.usuario;

  if (!nome || typeof nome !== 'string') {
    throw new Error('Nome é obrigatório e deve ser uma string');
  }
  if (!senha || typeof senha !== 'string') {
    throw new Error('Senha é obrigatória e deve ser uma string');
  }
  
  try {
    const existingUser = await pool.query(
      'SELECT id FROM usuario WHERE nome = $1',
      [nome]
    );
    
    if (existingUser.rows.length > 0) {
      throw new Error('Usuario já existe');
    }
    
    const senhaHasheada = hashPassword(senha);
    const salaResult = await criaSala();
    
    const userResult = await pool.query(
      'INSERT INTO usuario (nome, senha, sala_id) VALUES ($1, $2, $3) RETURNING *',
      [nome, senhaHasheada, salaResult.id]
    );
    
    return {
      nome: nome,
      sala: salaResult.hash
    };
    
  } catch (error) {
    console.log(error);
    throw error;
  }
}

// Login do usuario
async function loginUsuario(loginData) {
  const { nome, senha } = loginData.usuario;
  
  if (!nome || typeof nome !== 'string') {
    throw new Error('Nome é obrigatório e deve ser uma string');
  }
  if (!senha || typeof senha !== 'string') {
    throw new Error('Senha é obrigatória e deve ser uma string');
  }
  
  try {
    const userResult = await pool.query(
      'SELECT * FROM usuario WHERE nome = $1',
      [nome]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('Usuario ou senha incorretos');
    }
    
    const usuario = userResult.rows[0];
    const senhaHasheada = hashPassword(senha);
    
    if (usuario.senha !== senhaHasheada) {
      throw new Error('Usuario ou senha incorretos');
    }
    
    // Fetch sala data to get the hash
    const salaResult = await pool.query(
      'SELECT * FROM sala WHERE id = $1',
      [usuario.sala_id]
    );
    
    if (salaResult.rows.length === 0) {
      throw new Error('Sala não encontrada');
    }
    
    return {
      nome: usuario.nome,
      sala: salaResult.rows[0].hash
    };
    
  } catch (error) {
    console.log(error);
    throw error;
  }
}

module.exports = {
  createUsuarioESala,
  loginUsuario
};
