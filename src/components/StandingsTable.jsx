<<<<<<< HEAD
import React from 'react';
import { Eye } from 'lucide-react';

export default function StandingsTable({ standings, onSelectPlayer }) {
  return (
    <table className="standings-table">
      <thead>
        <tr>
          <th>Rank</th><th>Player</th><th>Score</th><th>BH-C1</th><th>BH</th><th>Info</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((p, i) => (
          <tr key={p.id}>
            <td>{i + 1}</td>
            <td>{p.name} {!p.active && '(Out)'}</td>
            <td>{p.score}</td>
            <td>{p.bhCut1}</td>
            <td>{p.bh}</td>
            <td>
              <button onClick={() => onSelectPlayer(p)} className="icon-btn">
                <Eye size={16} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
=======
import React from 'react';
import { Eye } from 'lucide-react';

export default function StandingsTable({ standings, onSelectPlayer }) {
  return (
    <table className="standings-table">
      <thead>
        <tr>
          <th>Rank</th><th>Player</th><th>Score</th><th>BH-C1</th><th>BH</th><th>Info</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((p, i) => (
          <tr key={p.id}>
            <td>{i + 1}</td>
            <td>{p.name} {!p.active && '(Out)'}</td>
            <td>{p.score}</td>
            <td>{p.bhCut1}</td>
            <td>{p.bh}</td>
            <td>
              <button onClick={() => onSelectPlayer(p)} className="icon-btn">
                <Eye size={16} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
>>>>>>> 2f2a1e6de3fce7566dc50d310af24a4ffcc80b09
}