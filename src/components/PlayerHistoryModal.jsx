import React from 'react';
import { X } from 'lucide-react';

export default function PlayerHistoryModal({ player, onClose, allPlayers }) {
  return (
    <div className="modal-overlay">
      <div className="setup-card modal-content">
        <div className="modal-header">
          <h3>History for {player.name}</h3>
          <button onClick={onClose} className="back-btn"><X size={20}/></button>
        </div>
        <table className="standings-table">
          <thead>
            <tr><th>Rd</th><th>Opponent</th><th>Color</th><th>Result</th></tr>
          </thead>
          <tbody>
            {player.history.map((h, i) => {
              const opp = allPlayers.find(p => p.id === h.opponentId);
              return (
                <tr key={i}>
                  <td>{h.round}</td>
                  <td>{h.opponentId === 'BYE' ? 'BYE' : (opp?.name || 'Unknown')}</td>
                  <td>{h.color || '-'}</td>
                  <td>{h.result}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}