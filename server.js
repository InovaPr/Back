const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const http = require('http'); // Para usar com ws
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

// Banco de dados PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Crie o servidor HTTP e WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Função para enviar mensagem a todos os clientes conectados no WebSocket
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// --- WEBSOCKET: aceita conexões e faz log simples ---
wss.on('connection', (ws) => {
  console.log('WebSocket: Cliente conectado');
  ws.on('close', () => {
    console.log('WebSocket: Cliente desconectado');
  });
  ws.on('message', (msg) => {
    // Se quiser tratar mensagens vindas do frontend, faça aqui
    console.log('Mensagem recebida do cliente WS:', msg);
  });
});

// --- CHAMADOS ABERTOS ---

// GET todos abertos
app.get('/chamados_abertos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chamados_abertos');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST novo aberto ou atualiza pelo id (upsert)
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
    // Notifique todos os clientes de um novo chamado aberto
    broadcast({ tipo: 'novo_chamado', chamado: t });
    res.json({ ok: true, id: t.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE um aberto por id
app.delete('/chamados_abertos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM chamados_abertos WHERE id = $1', [req.params.id]);
    // Notifique todos os clientes que um chamado foi removido
    broadcast({ tipo: 'remover_chamado', chamadoId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE todos os chamados abertos (LIMPAR)
app.delete('/chamados_abertos', async (req, res) => {
  try {
    await pool.query('DELETE FROM chamados_abertos');
    // Notifique todos os clientes para limpar a lista
    broadcast({ tipo: 'limpar_chamados_abertos' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CHAMADOS ARQUIVADOS ---

// GET todos arquivados
app.get('/chamados_arquivados', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chamados_arquivados');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST novo arquivado ou atualiza pelo id (upsert)
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
    // Opcional: Notifique sobre arquivamento se quiser
    broadcast({ tipo: 'atualizacao_chamado', chamado: t });
    res.json({ ok: true, id: t.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE todos os chamados arquivados (LIMPAR)
app.delete('/chamados_arquivados', async (req, res) => {
  try {
    await pool.query('DELETE FROM chamados_arquivados');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SERVE SPA ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- EXEMPLOS OPCIONAIS ---
app.get('/chamados', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chamados ORDER BY criado_em DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// Inicie o servidor (use server.listen, NÃO app.listen)
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
