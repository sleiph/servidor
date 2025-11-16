const tabelasValidas = ['carta'];

function validaTabelas(req, res, next) {
  const tabela = req.params.entidade;
  if (!tabelasValidas.includes(tabela)) {
    return res.status(400).json({ error: 'Tabela inválida.' });
  }
  next();
}

module.exports = validaTabelas;