import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Users, Trophy, Play, RotateCcw, FolderPlus, ChevronLeft, LogOut, Info, UserCheck, UserMinus } from 'lucide-react';

export default function ChessTournamentManager() {
  const [tournaments, setTournaments] = useState(() => {
    const saved = localStorage.getItem('chess_manager_data');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [activeId, setActiveId] = useState(null);
  const [newTName, setNewTName] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [viewingPlayerId, setViewingPlayerId] = useState(null); // State for Match History view

  useEffect(() => {
    localStorage.setItem('chess_manager_data', JSON.stringify(tournaments));
  }, [tournaments]);

  const activeT = tournaments[activeId];

  const updateActive = (updates) => {
    setTournaments(prev => ({
      ...prev,
      [activeId]: { ...prev[activeId], ...updates }
    }));
  };

  // --- TOURNAMENT MGMT ---
  const createTournament = () => {
    if (!newTName.trim()) return;
    const id = Date.now().toString();
    setTournaments(prev => ({
      ...prev,
      [id]: {
        id,
        name: newTName.trim(),
        players: [],
        currentRound: 0,
        totalRounds: 5,
        pairings: [],
        history: [], // Round-by-round pairings history
        started: false
      }
    }));
    setNewTName('');
    setActiveId(id);
  };

  // --- PLAYER MGMT ---
  const addPlayer = () => {
    if (newPlayerName.trim()) {
      const newPlayer = {
        id: Date.now(),
        name: newPlayerName.trim(),
        score: 0,
        opponents: [],
        colors: [], 
        matchHistory: [], // Stores round-by-round info
        active: true
      };
      updateActive({ players: [...activeT.players, newPlayer] });
      setNewPlayerName('');
    }
  };

  // Logic to withdraw or rejoin without deleting data
  const togglePlayerStatus = (id) => {
    updateActive({
      players: activeT.players.map(p => p.id === id ? { ...p, active: !p.active } : p)
    });
  };

  const calculateBuchholz = (player) => {
    return player.opponents.reduce((sum, oppId) => {
      const opponent = activeT.players.find(p => p.id === oppId);
      return sum + (opponent ? opponent.score : 0);
    }, 0);
  };

  // --- PAIRING LOGIC ---
  const generatePairings = () => {
    const activePlayers = activeT.players.filter(p => p.active);
    if (activePlayers.length < 2) return alert('Need 2+ active players');

    const sorted = [...activePlayers].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    const newPairings = [];
    const paired = new Set();
    let tempSorted = [...sorted];
    
    let byePlayer = null;
    if (tempSorted.length % 2 === 1) {
      for (let i = tempSorted.length - 1; i >= 0; i--) {
        const hasHadBye = activeT.history.some(r => r.pairings.some(p => p.bye && p.white.id === tempSorted[i].id));
        if (!hasHadBye) { byePlayer = tempSorted[i]; tempSorted.splice(i, 1); break; }
      }
      if (!byePlayer) byePlayer = tempSorted.pop();
    }

    for (let i = 0; i < tempSorted.length; i++) {
      if (paired.has(tempSorted[i].id)) continue;
      const p1 = tempSorted[i];
      let found = false;

      for (let j = i + 1; j < tempSorted.length; j++) {
        const p2 = tempSorted[j];
        if (!paired.has(p2.id) && !p1.opponents.includes(p2.id)) {
          const p1W = p1.colors.filter(c => c === 'w').length;
          const p2W = p2.colors.filter(c => c === 'w').length;
          let w, b;
          if (p1W <= p2W) { w = p1; b = p2; } else { w = p2; b = p1; }
          newPairings.push({ id: Date.now() + i + j, white: w, black: b, result: null, bye: false });
          paired.add(p1.id); paired.add(p2.id);
          found = true; break;
        }
      }
      if (!found) {
        for (let j = i + 1; j < tempSorted.length; j++) {
          if (!paired.has(tempSorted[j].id)) {
            newPairings.push({ id: Date.now() + i + j, white: p1, black: tempSorted[j], result: null, bye: false });
            paired.add(p1.id); paired.add(tempSorted[j].id);
            break;
          }
        }
      }
    }
    if (byePlayer) newPairings.push({ id: Date.now() + 999, white: byePlayer, black: null, result: '1-0', bye: true });

    updateActive({ pairings: newPairings, currentRound: activeT.currentRound + 1, started: true });
  };

  const submitResults = () => {
    if (!activeT.pairings.every(p => p.result)) return alert('Enter all results');
    const updatedPlayers = activeT.players.map(p => {
      const pairing = activeT.pairings.find(pair => pair.white.id === p.id || pair.black?.id === p.id);
      if (!pairing) return p;
      
      let score = p.score;
      let opps = [...p.opponents];
      let cols = [...p.colors];
      let history = p.matchHistory ? [...p.matchHistory] : [];

      if (pairing.bye) { 
        score += 1; 
        history.push({ round: activeT.currentRound, opponent: 'BYE', result: '1-0' });
      } else {
        const isWhite = pairing.white.id === p.id;
        const opponent = isWhite ? pairing.black : pairing.white;
        opps.push(opponent.id);
        cols.push(isWhite ? 'w' : 'b');
        
        // Save the detailed match info
        history.push({ 
          round: activeT.currentRound, 
          opponent: opponent.name, 
          result: pairing.result,
          side: isWhite ? 'White' : 'Black'
        });

        if (pairing.result === '1-0') score += isWhite ? 1 : 0;
        else if (pairing.result === '0-1') score += isWhite ? 0 : 1;
        else if (pairing.result === '0.5-0.5') score += 0.5;
      }
      return { ...p, score, opponents: opps, colors: cols, matchHistory: history };
    });
    updateActive({ players: updatedPlayers, history: [...activeT.history, { round: activeT.currentRound, pairings: activeT.pairings }], pairings: [] });
  };

  if (!activeId) {
    return (
      <div className="App chess-board-pattern">
        <h1 className="gold-text">Swiss Tournament Manager</h1>
        <div className="setup-card">
          <div className="input-group">
            <input placeholder="Tournament Name..." value={newTName} onChange={e => setNewTName(e.target.value)} />
            <button onClick={createTournament} className="gold-btn"><FolderPlus size={18}/> New Event</button>
          </div>
          {Object.values(tournaments).map(t => (
            <div key={t.id} onClick={() => setActiveId(t.id)} className="tournament-item">
              <span>{t.name} ({t.players.length} Players)</span>
              <Trophy size={18} color="#ffd700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const standings = [...activeT.players].map(p => ({ ...p, bh: calculateBuchholz(p) }))
    .sort((a, b) => b.score - a.score || b.bh - a.bh || a.name.localeCompare(b.name));

  const viewingPlayer = activeT.players.find(p => p.id === viewingPlayerId);

  return (
    <div className="App">
      <div className="container">
        <button onClick={() => {setActiveId(null); setViewingPlayerId(null);}} className="back-btn"><ChevronLeft size={20}/> Exit Tournament</button>
        <h1 className="gold-text">{activeT.name}</h1>

        {/* Player Setup Phase */}
        {!activeT.started && (
          <div className="setup-card">
            <h2><Users size={20}/> Player Setup</h2>
            <div className="input-group">
              <input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} placeholder="Player Name" />
              <button onClick={addPlayer} className="gold-btn"><Plus /> Add</button>
            </div>
            <div className="player-grid">
              {activeT.players.map(p => (
                <div key={p.id} className={`p-card ${p.active ? '' : 'inactive'}`} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span>{p.name} {p.active ? '' : '(Out)'}</span>
                  <button onClick={(e) => { e.stopPropagation(); togglePlayerStatus(p.id); }} className="icon-btn">
                    {p.active ? <UserMinus size={16} color="#ff4d4d"/> : <UserCheck size={16} color="#4CAF50"/>}
                  </button>
                </div>
              ))}
            </div>
            {activeT.players.length >= 2 && <button onClick={generatePairings} className="start-btn">Start Round 1</button>}
          </div>
        )}

        {/* Pairing/Round Phase */}
        {activeT.pairings.length > 0 && (
          <div className="setup-card">
            <h2>Round {activeT.currentRound}</h2>
            {activeT.pairings.map(p => (
              <div key={p.id} className="pairing-row">
                <div className="player-box white">{p.white.name} ({p.white.score})</div>
                <div className="vs">VS</div>
                <div className="player-box black">{p.bye ? 'BYE' : `${p.black.name} (${p.black.score})`}</div>
                {!p.bye && (
                  <div className="res-group">
                    {['1-0', '0.5-0.5', '0-1'].map(r => (
                      <button key={r} className={p.result === r ? 'active-res' : ''} onClick={() => {
                        const updated = activeT.pairings.map(pair => pair.id === p.id ? { ...pair, result: r } : pair);
                        updateActive({ pairings: updated });
                      }}>{r}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button onClick={submitResults} className="start-btn">Submit Round</button>
          </div>
        )}

        {/* Standings and History Phase */}
        {activeT.started && (
          <div className="setup-card" style={{ marginTop: '2rem' }}>
            <h2>Standings (Buchholz Tie-break)</h2>
            <table className="standings-table">
              <thead><tr><th>Rank</th><th>Player</th><th>Score</th><th>Buchholz</th><th>Actions</th></tr></thead>
              <tbody>
                {standings.map((p, i) => (
                  <tr key={p.id} className={p.active ? '' : 'withdrawn-row'}>
                    <td>{i+1}</td>
                    <td>{p.name} {!p.active && <small>(Out)</small>}</td>
                    <td>{p.score}</td>
                    <td>{p.bh}</td>
                    <td>
                      <div style={{display: 'flex', gap: '10px'}}>
                        <button onClick={() => setViewingPlayerId(p.id)} className="icon-btn" title="View History"><Info size={18} color="#ffd700"/></button>
                        <button onClick={() => togglePlayerStatus(p.id)} title={p.active ? "Withdraw" : "Rejoin"} className="icon-btn">
                          {p.active ? <UserMinus size={18} color="#ff4d4d"/> : <UserCheck size={18} color="#4CAF50"/>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {activeT.pairings.length === 0 && <button onClick={generatePairings} className="start-btn">Pair Next Round</button>}
          </div>
        )}

        {/* Detailed Player History View */}
        {viewingPlayer && (
          <div className="setup-card" style={{ marginTop: '2rem', border: '1px solid #ffd700' }}>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <h2>Match History: {viewingPlayer.name}</h2>
                <button onClick={() => setViewingPlayerId(null)} className="gold-btn">Close Details</button>
            </div>
            <table className="standings-table">
                <thead><tr><th>Round</th><th>Opponent</th><th>Side</th><th>Result</th></tr></thead>
                <tbody>
                    {viewingPlayer.matchHistory.map((m, idx) => (
                        <tr key={idx}>
                            <td>{m.round}</td>
                            <td>{m.opponent}</td>
                            <td>{m.side || 'N/A'}</td>
                            <td>{m.result}</td>
                        </tr>
                    ))}
                    {viewingPlayer.matchHistory.length === 0 && <tr><td colSpan="4">No games played yet.</td></tr>}
                </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}