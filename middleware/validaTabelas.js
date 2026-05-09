const tabelasValidas = ['carta', 'usuario', 'sala'];

function validaTabelas(req, res, next) {
  const tabela = req.params.entidade;
  if (!tabelasValidas.includes(tabela)) {
    return res.status(400).json({ error: 'Tabela inválida, adicionar na classe de validação de tabelas.' });
  }
  next();
}

module.exports = validaTabelas;