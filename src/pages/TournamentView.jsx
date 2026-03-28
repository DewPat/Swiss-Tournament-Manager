import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Plus, Users, Trophy, ChevronLeft, Info, UserCheck, UserMinus, Download } from 'lucide-react';

export default function TournamentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeT, setActiveT] = useState(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [viewingPlayerId, setViewingPlayerId] = useState(null);
  const [activeTab, setActiveTab] = useState('rounds');
  const [loading, setLoading] = useState(true);

  // Load tournament data
  const loadTournament = async () => {
    try {
      const res = await api.get(`/tournaments/${id}`);
      setActiveT(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      navigate('/');
    }
  };

  useEffect(() => {
    loadTournament();
  }, [id]);

  if (loading) return <div style={{color: 'white', textAlign: 'center', marginTop: '50px'}}>Loading...</div>;
  if (!activeT) return null;

  // --- PLAYER MGMT ---
  const addPlayer = async () => {
    if (!newPlayerName.trim()) return;
    try {
      await api.post(`/tournaments/${id}/players`, { name: newPlayerName.trim() });
      setNewPlayerName('');
      loadTournament(); // refresh
    } catch (err) {
      console.error(err);
    }
  };

  const togglePlayerStatus = async (pId) => {
    try {
      await api.put(`/tournaments/${id}/players/${pId}/toggle`);
      const updatedPlayers = activeT.players.map(p => p.id === pId ? { ...p, active: !p.active } : p);
      setActiveT({ ...activeT, players: updatedPlayers });
    } catch (err) { console.error(err); }
  };

  const calculateBuchholz = (player) => {
    return player.opponents.reduce((sum, oppId) => {
      const opponent = activeT.players.find(p => p.id === oppId);
      return sum + (opponent ? opponent.score : 0);
    }, 0);
  };

  // --- PAIRING LOGIC ---
  const generatePairings = async () => {
    const activePlayers = activeT.players.filter(p => p.active);
    if (activePlayers.length < 2) return alert('Need 2+ active players');

    const sorted = [...activePlayers].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    const newPairings = [];
    const paired = new Set();
    let tempSorted = [...sorted];
    let byePlayer = null;

    if (tempSorted.length % 2 === 1) {
      // Find lowest score player without bye
      for (let i = tempSorted.length - 1; i >= 0; i--) {
        const hasHadBye = tempSorted[i].matchHistory.some(m => m.opponent === 'BYE');
        if (!hasHadBye) { byePlayer = tempSorted[i]; tempSorted.splice(i, 1); break; }
      }
      if (!byePlayer) byePlayer = tempSorted.pop();
    }

    for (let i = 0; i < tempSorted.length; i++) {
      if (paired.has(tempSorted[i].id)) continue;
      const p1 = tempSorted[i];
      let found = false;

      // Try near score match who hasn't played
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
      // Dump to first unpaired 
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

    try {
      await api.post(`/tournaments/${id}/rounds`, { pairings: newPairings });
      loadTournament(); // Refresh to get the actual round and pairings from DB
    } catch (err) { console.error(err); }
  };

  const submitResults = async () => {
    if (!activeT.pairings.every(p => p.result)) return alert('Enter all results');
    
    const updatedPlayersDict = {};
    activeT.players.forEach(p => updatedPlayersDict[p.id] = { ...p });

    const resultsPayload = [];

    activeT.pairings.forEach(pairing => {
      resultsPayload.push({ id: pairing.id, result: pairing.result });

      const pW = updatedPlayersDict[pairing.white_player_id || pairing.white?.id];
      const pB = pairing.bye ? null : updatedPlayersDict[pairing.black_player_id || pairing.black?.id];

      if (pairing.bye && pW) {
        pW.score += 1;
        pW.matchHistory.push({ round: activeT.current_round + 1, opponent: 'BYE', result: '1-0' });
      } else if (pW && pB) {
         pW.opponents.push(pB.id);
         pB.opponents.push(pW.id);
         pW.colors.push('w');
         pB.colors.push('b');
         
         pW.matchHistory.push({ round: activeT.current_round + 1, opponent: pB.name, result: pairing.result, side: 'White' });
         pB.matchHistory.push({ round: activeT.current_round + 1, opponent: pW.name, result: pairing.result, side: 'Black' });

         if (pairing.result === '1-0') { pW.score += 1; }
         else if (pairing.result === '0-1') { pB.score += 1; }
         else if (pairing.result === '0.5-0.5') { pW.score += 0.5; pB.score += 0.5; }
      }
    });

    try {
      await api.post(`/tournaments/${id}/results`, { 
        results: resultsPayload, 
        updatedPlayers: Object.values(updatedPlayersDict) 
      });
      loadTournament(); // It will fetch updated players, empty pairings, etc.
    } catch (err) { console.error(err); }
  };

  const updatePairingResultLocal = (pId, res) => {
    setActiveT({
       ...activeT,
       pairings: activeT.pairings.map(p => p.id === pId ? { ...p, result: res } : p)
    });
  };

  const standings = [...activeT.players].map(p => ({ ...p, bh: calculateBuchholz(p) }))
    .sort((a, b) => b.score - a.score || b.bh - a.bh || a.name.localeCompare(b.name));

  const exportStandingsCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,Rank,Player,Score,Buchholz\n";
    standings.forEach((p, i) => { csvContent += `${i + 1},${p.name},${p.score},${p.bh}\n`; });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = `${activeT.name}_Standings.csv`;
    link.click();
  };

  const viewingPlayer = activeT.players.find(p => p.id === viewingPlayerId);
  const isStarted = activeT.status === 'started' || activeT.status === 'completed';

  return (
    <div className="App chess-board-pattern">
      <div className="container">
        <button onClick={() => navigate('/')} className="back-btn"><ChevronLeft size={20} /> Dashboard</button>
        <h1 className="gold-text">{activeT.name}</h1>

        <div className="setup-card" style={{ marginBottom: '1rem' }}>
          <div style={{display: 'flex', alignItems:'center', justifyContent: 'space-between'}}>
             <h2><Users size={20} /> {isStarted ? 'Add Late Entry Player' : 'Player Setup'}</h2>
             {isStarted && <p style={{fontSize: '0.8rem', color: '#ccc'}}>*New players will get 0.5 points for each missed round automatically.</p>}
          </div>
          <div className="input-group">
            <input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} placeholder="Player Name" />
            <button onClick={addPlayer} className="gold-btn"><Plus /> Add</button>
          </div>
          
          {!isStarted && (
            <>
              <div className="player-grid" style={{ marginTop: '1rem' }}>
                {activeT.players.map(p => (
                  <div key={p.id} className={`p-card ${p.active ? '' : 'inactive'}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{p.name} {p.active ? '' : '(Out)'}</span>
                    <button onClick={(e) => { e.stopPropagation(); togglePlayerStatus(p.id); }} className="icon-btn">
                      {p.active ? <UserMinus size={16} color="#ff4d4d" /> : <UserCheck size={16} color="#4CAF50" />}
                    </button>
                  </div>
                ))}
              </div>
              {activeT.players.length >= 2 && <button onClick={generatePairings} className="start-btn" style={{marginTop:'1rem'}}>Start Round 1</button>}
            </>
          )}
        </div>

        {isStarted && (
          <>
            <div className="tab-container" style={{ display: 'flex', gap: '10px' }}>
              <button className={`tab-btn ${activeTab === 'rounds' ? 'active-tab' : ''}`} style={{ flex: 1, padding: '10px', borderRadius: '5px' }} onClick={() => setActiveTab('rounds')}>Rounds & Pairings</button>
              <button className={`tab-btn ${activeTab === 'standings' ? 'active-tab' : ''}`} style={{ flex: 1, padding: '10px', borderRadius: '5px' }} onClick={() => setActiveTab('standings')}>Standings & History</button>
            </div>

            {activeTab === 'rounds' && activeT.pairings.length > 0 && activeT.pairings.some(p => !p.result) && (
              <div className="setup-card mt-3">
                <h2>Round {activeT.current_round + 1} of {activeT.total_rounds} Pairings</h2>
                {activeT.pairings.map(p => {
                  const pW = activeT.players.find(x => x.id === (p.white_player_id || p.white?.id));
                  const pB = p.bye ? null : activeT.players.find(x => x.id === (p.black_player_id || p.black?.id));
                  
                  return (
                    <div key={p.id} className="pairing-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', marginBottom: '10px', backgroundColor: '#334155', borderRadius: '5px' }}>
                      <div className="player-box" style={{ backgroundColor: 'white', color: 'black', padding: '10px', borderRadius: '5px' }}>{pW?.name} ({pW?.score})</div>
                      <div className="vs" style={{ color: '#fbbf24', fontWeight: 'bold', padding: '0 10px' }}>VS</div>
                      <div className="player-box" style={{ backgroundColor: 'black', color: 'white', border: '1px solid #475569', padding: '10px', borderRadius: '5px' }}>{p.bye ? 'BYE' : `${pB?.name} (${pB?.score})`}</div>
                      {!p.bye && (
                        <div className="res-group" style={{ display: 'flex', gap: '5px', marginLeft: '1rem' }}>
                          {['1-0', '0.5-0.5', '0-1'].map(r => (
                            <button key={r} style={{ padding: '5px 10px', border: '1px solid transparent', borderRadius: '5px', backgroundColor: p.result === r ? '#f59e0b' : '#475569', color: p.result === r ? 'black' : 'white' }} onClick={() => updatePairingResultLocal(p.id, r)}>{r}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                <button onClick={submitResults} className="start-btn mt-4">Save Results</button>
              </div>
            )}

            {activeTab === 'rounds' && (activeT.pairings.length === 0 || activeT.pairings.every(p => p.result)) && (
               <div className="setup-card" style={{ marginTop: '1rem', textAlign: 'center' }}>
                 {activeT.current_round < activeT.total_rounds ? (
                   <>
                     <h2 style={{ marginBottom: '1rem', color: '#f59e0b', fontSize: '1.25rem', fontWeight: 'bold' }}>Round {activeT.current_round} Complete!</h2>
                     <button onClick={generatePairings} className="start-btn" style={{ padding: '15px 30px', fontSize: '1.1rem' }}>Pair Round {activeT.current_round + 1}</button>
                   </>
                 ) : (
                   <h2 className="gold-text" style={{ fontSize: '1.5rem', padding: '1rem 0' }}>🏆 Tournament Completed! 🏆</h2>
                 )}
               </div>
            )}

            {activeTab === 'standings' && (
              <div className="setup-card slide-up" style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h2 style={{ margin: 0 }}>Standings (Buchholz Tie-break)</h2>
                  <button onClick={exportStandingsCSV} className="gold-btn"><Download size={16} /> Export CSV</button>
                </div>
                <div className="table-responsive">
                  <table className="standings-table">
                    <thead><tr><th>Rank</th><th>Player</th><th>Score</th><th>Buchholz</th><th>Actions</th></tr></thead>
                    <tbody>
                      {standings.map((p, i) => (
                        <tr key={p.id} className={p.active ? '' : 'withdrawn-row'}>
                          <td>{i + 1}</td>
                          <td>{p.name} {!p.active && <small>(Out)</small>}</td>
                          <td>{p.score}</td>
                          <td>{p.bh}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button onClick={() => setViewingPlayerId(p.id)} className="icon-btn" title="View History"><Info size={18} color="#ffd700" /></button>
                              <button onClick={() => togglePlayerStatus(p.id)} title={p.active ? "Withdraw" : "Rejoin"} className="icon-btn">
                                {p.active ? <UserMinus size={18} color="#ff4d4d" /> : <UserCheck size={18} color="#4CAF50" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {viewingPlayer && (
              <div className="setup-card" style={{ marginTop: '1rem', border: '1px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h2>History: {viewingPlayer.name}</h2>
                  <button onClick={() => setViewingPlayerId(null)} className="gold-btn">Close</button>
                </div>
                <table className="standings-table">
                  <thead><tr><th>Round</th><th>Opponent</th><th>Side</th><th>Result</th></tr></thead>
                  <tbody>
                    {viewingPlayer.matchHistory.map((m, idx) => (
                      <tr key={idx}><td>{m.round}</td><td>{m.opponent}</td><td>{m.side || 'N/A'}</td><td>{m.result}</td></tr>
                    ))}
                    {viewingPlayer.matchHistory.length === 0 && <tr><td colSpan="4">No games.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
