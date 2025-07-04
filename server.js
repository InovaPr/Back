const express = require('express');
const { Pool } = require('pg'); // não esqueça do require
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do pool do Postgres (DATABASE_URL já é padrão no Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (HTML, CSS, JS, imagens) da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Endpoints CHAMADOS ABERTOS
app.get('/chamados_abertos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chamados_abertos');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/chamados_abertos', async (req, res) => {
  const t = req.body;
  try {
    await pool.query(
      `INSERT INTO chamados_abertos (id, tempo_previsto, cliente, problema, operador, executor, hora_inicio, data_abertura, hora_fim, timerState, timerType, accumulatedTime, startTime)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
         tempo_previsto=EXCLUDED.tempo_previsto,
         cliente=EXCLUDED.cliente,
         problema=EXCLUDED.problema,
         operador=EXCLUDED.operador,
         executor=EXCLUDED.executor,
         hora_inicio=EXCLUDED.hora_inicio,
         data_abertura=EXCLUDED.data_abertura,
         hora_fim=EXCLUDED.hora_fim,
         timerState=EXCLUDED.timerState,
         timerType=EXCLUDED.timerType,
         accumulatedTime=EXCLUDED.accumulatedTime,
         startTime=EXCLUDED.startTime`,
      [t.id, t.tempo_previsto, t.cliente, t.problema, t.operador, t.executor, t.hora_inicio, t.data_abertura, t.hora_fim, t.timerState, t.timerType, t.accumulatedTime, t.startTime]
    );
    res.json({ ok: true, id: t.id });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.delete('/chamados_abertos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM chamados_abertos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Endpoints CHAMADOS ARQUIVADOS
app.get('/chamados_arquivados', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chamados_arquivados');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/chamados_arquivados', async (req, res) => {
  const t = req.body;
  try {
    await pool.query(
      `INSERT INTO chamados_arquivados (id, tempo_previsto, cliente, problema, operador, executor, data_hora_abertura, hora_fim, arquivado_por, inicio, fim, tempo_decorrido, status_prazo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
         tempo_previsto=EXCLUDED.tempo_previsto,
         cliente=EXCLUDED.cliente,
         problema=EXCLUDED.problema,
         operador=EXCLUDED.operador,
         executor=EXCLUDED.executor,
         data_hora_abertura=EXCLUDED.data_hora_abertura,
         hora_fim=EXCLUDED.hora_fim,
         arquivado_por=EXCLUDED.arquivado_por,
         inicio=EXCLUDED.inicio,
         fim=EXCLUDED.fim,
         tempo_decorrido=EXCLUDED.tempo_decorrido,
         status_prazo=EXCLUDED.status_prazo`,
      [t.id, t.tempo_previsto, t.cliente, t.problema, t.operador, t.executor, t.data_hora_abertura, t.hora_fim, t.arquivado_por, t.inicio, t.fim, t.tempo_decorrido, t.status_prazo]
    );
    res.json({ ok: true, id: t.id });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.delete('/chamados_arquivados', async (req, res) => {
  try {
    await pool.query('DELETE FROM chamados_arquivados');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Rota para servir index.html na raiz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// GET /chamados – lista todos os chamados
app.get('/chamados', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chamados ORDER BY criado_em DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /chamados – cria um chamado
app.post('/chamados', async (req, res) => {
  const { titulo, descricao } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO chamados (titulo, descricao) VALUES ($1, $2) RETURNING id, titulo, descricao, criado_em',
      [titulo, descricao]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /chamados/:id – pega um chamado específico
app.get('/chamados/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chamados WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inicie o servidor (apenas UMA VEZ, no final)
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
