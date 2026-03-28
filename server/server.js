require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db.js');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key';

// Middleware to protect routes
const authMid = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
    res.json({ message: 'User created', userId: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username taken' });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TOURNAMENT ENDPOINTS ---

app.get('/api/tournaments', authMid, async (req, res) => {
  try {
    const [tRows] = await pool.query('SELECT id, name, status, current_round, total_rounds FROM tournaments WHERE user_id = ?', [req.userId]);
    // Also get player count per tournament
    for (let t of tRows) {
      const [pRows] = await pool.query('SELECT COUNT(*) as cnt FROM players WHERE tournament_id = ?', [t.id]);
      t.playerCount = pRows[0].cnt;
    }
    res.json(tRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tournaments', authMid, async (req, res) => {
  const { name, totalRounds } = req.body;
  const id = Date.now().toString();
  try {
    await pool.query(
      'INSERT INTO tournaments (id, user_id, name, status, current_round, total_rounds) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.userId, name, 'setup', 0, totalRounds]
    );
    res.json({ id, name, totalRounds, status: 'setup', currentRound: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tournaments/:id', authMid, async (req, res) => {
  try {
    await pool.query('DELETE FROM tournaments WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET full tournament (with players and recent pairings)
app.get('/api/tournaments/:id', authMid, async (req, res) => {
  try {
    const [tRows] = await pool.query('SELECT * FROM tournaments WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (tRows.length === 0) return res.status(404).json({ error: 'Not found' });
    const tournament = tRows[0];
    
    const [pRows] = await pool.query('SELECT * FROM players WHERE tournament_id = ?', [tournament.id]);
    
    const players = pRows.map(p => ({
      ...p,
      active: p.active === 1,
      matchHistory: p.match_history || [],
      opponents: p.opponents || [],
      colors: p.colors || []
    }));

    const [pairRows] = await pool.query('SELECT * FROM pairings WHERE tournament_id = ? AND round = ?', [tournament.id, tournament.current_round + (tournament.status === 'started' ? 1 : 0)]);
    const pairings = pairRows.map(p => ({
      ...p,
      bye: p.bye === 1
    }));
    
    res.json({ ...tournament, players, pairings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// Add Player
app.post('/api/tournaments/:id/players', authMid, async (req, res) => {
  const { name } = req.body;
  const tId = req.params.id;
  const pId = Date.now().toString() + Math.floor(Math.random() * 1000);
  try {
    // Check tournament status to calculate half-point byes
    const [tRows] = await pool.query('SELECT current_round, status FROM tournaments WHERE id = ? AND user_id = ?', [tId, req.userId]);
    if (tRows.length === 0) return res.status(404).json({ error: 'Tournament not found' });
    const t = tRows[0];
    
    // Half-point bye logic for late entries
    let startingScore = 0;
    if (t.status === 'started' && t.current_round > 0) {
      // 0.5 points for every missed round
      startingScore = t.current_round * 0.5;
    }

    await pool.query(
      'INSERT INTO players (id, tournament_id, name, score, active, match_history, opponents, colors) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [pId, tId, name, startingScore, true, JSON.stringify([]), JSON.stringify([]), JSON.stringify([])]
    );
    res.json({ id: pId, name, score: startingScore, active: true, matchHistory: [], opponents: [], colors: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Player Active Status
app.put('/api/tournaments/:tId/players/:pId/toggle', authMid, async (req, res) => {
  try {
    const { tId, pId } = req.params;
    await pool.query('UPDATE players SET active = NOT active WHERE id = ? AND tournament_id = ?', [pId, tId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Save full list of new round pairings and increment round
app.post('/api/tournaments/:id/rounds', authMid, async (req, res) => {
  const { pairings } = req.body; // array of { id, white, black, bye }
  const tId = req.params.id;
  try {
    const [tRows] = await pool.query('SELECT current_round, status FROM tournaments WHERE id = ? AND user_id = ?', [tId, req.userId]);
    const currentRound = tRows[0].current_round + 1;
    
    for (let p of pairings) {
      await pool.query(
        'INSERT INTO pairings (id, tournament_id, round, white_player_id, black_player_id, bye) VALUES (?, ?, ?, ?, ?, ?)',
        [p.id, tId, currentRound, p.white.id, p.black ? p.black.id : null, p.bye]
      );
    }
    
    await pool.query('UPDATE tournaments SET current_round = ?, status = "started" WHERE id = ?', [currentRound, tId]);
    res.json({ success: true, currentRound });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tournaments/:id/results', authMid, async (req, res) => {
  const { results, updatedPlayers } = req.body; 
  // results: [{ id (pairing id), result }]
  // updatedPlayers: array of updated player objects to override in db
  const tId = req.params.id;
  try {
    for (let resItem of results) {
      await pool.query('UPDATE pairings SET result = ? WHERE id = ? AND tournament_id = ?', [resItem.result, resItem.id, tId]);
    }
    for (let pl of updatedPlayers) {
      await pool.query(
        'UPDATE players SET score = ?, opponents = ?, colors = ?, match_history = ? WHERE id = ? AND tournament_id = ?',
        [pl.score, JSON.stringify(pl.opponents), JSON.stringify(pl.colors), JSON.stringify(pl.matchHistory), pl.id, tId]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
