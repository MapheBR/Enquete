const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/polls', (req, res) => {
  const { question, options } = req.body;
  if (!question || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'Pergunta e pelo menos 2 opções são necessárias.' });
  }

  db.run('BEGIN TRANSACTION');
  db.run('INSERT INTO polls (question) VALUES (?)', [question], function (err) {
    if (err) {
      db.run('ROLLBACK');
      return res.status(500).json({ error: 'Erro ao criar enquete.' });
    }
    const pollId = this.lastID;
    const stmt = db.prepare('INSERT INTO options (poll_id, text) VALUES (?, ?)');
    for (const opt of options) {
      stmt.run(pollId, opt);
    }
    stmt.finalize(err2 => {
      if (err2) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Erro ao criar opções.' });
      }
      db.run('COMMIT');
      res.json({ id: pollId });
    });
  });
});

// endpoint opcional para listar enquetes
app.get('/api/polls', (req, res) => {
  db.all('SELECT * FROM polls ORDER BY created_at DESC', [], (err, polls) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    const tasks = polls.map(p => new Promise((resolve) => {
      db.all('SELECT id, text, votes FROM options WHERE poll_id = ?', [p.id], (e, opts) => {
        resolve({ ...p, options: opts });
      });
    }));
    Promise.all(tasks).then(results => res.json(results));
  });
});

// novo endpoint: retorna uma enquete específica com opções
app.get('/api/polls/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT id, question, created_at FROM polls WHERE id = ?', [id], (err, poll) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!poll) return res.status(404).json({ error: 'Enquete não encontrada' });
    db.all('SELECT id, text, votes FROM options WHERE poll_id = ?', [id], (e, opts) => {
      if (e) return res.status(500).json({ error: 'DB error' });
      poll.options = opts;
      res.json(poll);
    });
  });
});

// novo endpoint: votar em uma opção da enquete
app.post('/api/polls/:id/vote', (req, res) => {
  const pollId = req.params.id;
  const { optionId } = req.body;
  if (!optionId) return res.status(400).json({ error: 'optionId é obrigatório' });

  db.run('BEGIN TRANSACTION');
  db.run('UPDATE options SET votes = votes + 1 WHERE id = ? AND poll_id = ?', [optionId, pollId], function (err) {
    if (err || this.changes === 0) {
      db.run('ROLLBACK');
      return res.status(400).json({ error: 'Opção inválida ou erro ao votar' });
    }

    // retornar a enquete atualizada
    db.get('SELECT id, question, created_at FROM polls WHERE id = ?', [pollId], (err2, poll) => {
      if (err2 || !poll) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Erro ao carregar enquete' });
      }
      db.all('SELECT id, text, votes FROM options WHERE poll_id = ?', [pollId], (e, opts) => {
        if (e) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Erro ao carregar opções' });
        }
        db.run('COMMIT');
        poll.options = opts;
        res.json(poll);
      });
    });
  });
});

// apagar uma enquete (cascata apaga opções se foreign_keys habilitado)
app.delete('/api/polls/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM polls WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao apagar enquete' });
    if (this.changes === 0) return res.status(404).json({ error: 'Enquete não encontrada' });
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));