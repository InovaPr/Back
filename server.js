const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (HTML, CSS, JS, imagens) da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rotas de API
const db = new sqlite3.Database('./meubanco.db', (err) => {
  if (err) return console.error(err.message);
  db.run(`CREATE TABLE IF NOT EXISTS chamados_abertos (
    id TEXT PRIMARY KEY,
    tempo_previsto TEXT,
    cliente TEXT,
    problema TEXT,
    operador TEXT,
    executor TEXT,
    hora_inicio TEXT,
    data_abertura TEXT,
    hora_fim TEXT,
    timerState TEXT,
    timerType TEXT,
    accumulatedTime TEXT,
    startTime TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS chamados_arquivados (
    id TEXT PRIMARY KEY,
    tempo_previsto TEXT,
    cliente TEXT,
    problema TEXT,
    operador TEXT,
    executor TEXT,
    data_hora_abertura TEXT,
    hora_fim TEXT,
    arquivado_por TEXT,
    inicio TEXT,
    fim TEXT,
    tempo_decorrido TEXT,
    status_prazo TEXT
  )`);
  // Tabela principal para /chamados
  db.run(`
    CREATE TABLE IF NOT EXISTS chamados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Endpoints CHAMADOS ABERTOS
app.get('/chamados_abertos', (req, res) => {
  db.all('SELECT * FROM chamados_abertos', [], (err, rows) => {
    if (err) return res.status(500).json({erro: err.message});
    res.json(rows);
  });
});
app.post('/chamados_abertos', (req, res) => {
  const t = req.body;
  db.run(`INSERT OR REPLACE INTO chamados_abertos VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [t.id, t.tempo_previsto, t.cliente, t.problema, t.operador, t.executor, t.hora_inicio, t.data_abertura, t.hora_fim, t.timerState, t.timerType, t.accumulatedTime, t.startTime],
    function (err) {
      if (err) return res.status(500).json({erro: err.message});
      res.json({ok: true, id: t.id});
    });
});
app.delete('/chamados_abertos/:id', (req, res) => {
  db.run('DELETE FROM chamados_abertos WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({erro: err.message});
    res.json({ok: true});
  });
});

// Endpoints CHAMADOS ARQUIVADOS
app.get('/chamados_arquivados', (req, res) => {
  db.all('SELECT * FROM chamados_arquivados', [], (err, rows) => {
    if (err) return res.status(500).json({erro: err.message});
    res.json(rows);
  });
});
app.post('/chamados_arquivados', (req, res) => {
  const t = req.body;
  db.run(`INSERT OR REPLACE INTO chamados_arquivados VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [t.id, t.tempo_previsto, t.cliente, t.problema, t.operador, t.executor, t.data_hora_abertura, t.hora_fim, t.arquivado_por, t.inicio, t.fim, t.tempo_decorrido, t.status_prazo],
    function (err) {
      if (err) return res.status(500).json({erro: err.message});
      res.json({ok: true, id: t.id});
    });
});
app.delete('/chamados_arquivados', (req, res) => {
  db.run('DELETE FROM chamados_arquivados', [], function (err) {
    if (err) return res.status(500).json({erro: err.message});
    res.json({ok: true});
  });
});

// Rota para servir index.html na raiz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// GET /chamados – lista todos os chamados
app.get('/chamados', (req, res) => {
  db.all('SELECT * FROM chamados ORDER BY criado_em DESC', [], (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

// POST /chamados – cria um chamado
app.post('/chamados', (req, res) => {
  const { titulo, descricao } = req.body;
  db.run('INSERT INTO chamados (titulo, descricao) VALUES (?, ?)', [titulo, descricao], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.status(201).json({ id: this.lastID, titulo, descricao, criado_em: new Date() });
  });
});

// GET /chamados/:id – pega um chamado específico
app.get('/chamados/:id', (req, res) => {
  db.get('SELECT * FROM chamados WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({error: err.message});
    if (!row) return res.status(404).json({error: 'Chamado não encontrado'});
    res.json(row);
  });
});

// Inicie o servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://192.168.0.31:${PORT}`);
});