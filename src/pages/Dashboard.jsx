import React, { useState, useEffect, useContext } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Plus, Trash2, Trophy, FolderPlus, LogOut, Settings } from 'lucide-react';

export default function Dashboard() {
  const [tournaments, setTournaments] = useState([]);
  const [newTName, setNewTName] = useState('');
  const [newTRounds, setNewTRounds] = useState(5);
  const navigate = useNavigate();
  const { logout, user } = useContext(AuthContext);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const res = await api.get('/tournaments');
      setTournaments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const createTournament = async () => {
    if (!newTName.trim()) return;
    try {
      await api.post('/tournaments', { name: newTName.trim(), totalRounds: newTRounds });
      setNewTName('');
      setNewTRounds(5);
      fetchTournaments();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTournament = async (id) => {
    if (window.confirm("Are you sure you want to delete this tournament?")) {
      try {
        await api.delete(`/tournaments/${id}`);
        setTournaments(tournaments.filter(t => t.id !== id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="App chess-board-pattern">
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem' }}>
        <h1 className="gold-text">Welcome, {user?.username}</h1>
        <div>
           {/* <button onClick={() => navigate('/settings')} className="icon-btn gold-btn" style={{ marginRight: '10px' }}><Settings size={18}/> Settings</button> */}
           <button onClick={() => { logout(); navigate('/login'); }} className="icon-btn" style={{ background: '#ef4444', color: 'white', padding: '8px 15px', borderRadius: '5px' }}>
             <LogOut size={18}/> Logout
           </button>
        </div>
      </div>

      <div className="setup-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2>Your Tournaments</h2>
        <div className="input-group">
          <input placeholder="Tournament Name..." value={newTName} onChange={e => setNewTName(e.target.value)} />
          <input type="number" min="1" max="20" placeholder="Rounds" value={newTRounds} onChange={e => setNewTRounds(Number(e.target.value))} style={{ maxWidth: '80px' }} title="Number of Rounds" />
          <button onClick={createTournament} className="gold-btn"><FolderPlus size={18} /> New Event</button>
        </div>
        
        {tournaments.length === 0 ? (
           <p style={{ textAlign: 'center', marginTop: '2rem' }}>No tournaments yet. Create one above!</p>
        ) : (
          tournaments.map(t => (
            <div key={t.id} className="tournament-item" style={{ marginTop: '1rem' }}>
              <div onClick={() => navigate(`/tournament/${t.id}`)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <span>{t.name} ({t.playerCount || 0} Players) - {t.status === 'setup' ? 'Setup Mode' : `Round ${t.current_round}/${t.total_rounds}`}</span>
                <Trophy size={18} color="#ffd700" />
              </div>
              <button onClick={(e) => { e.stopPropagation(); deleteTournament(t.id); }} className="icon-btn" title="Delete Tournament">
                <Trash2 size={20} color="#ef4444" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
