import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="App chess-board-pattern" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="setup-card" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
        <h1 className="gold-text" style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2rem' }}>Login to Swiss Manager</h1>
        {error && <div style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
          <button type="submit" className="start-btn" style={{ marginTop: '1rem' }}>Login</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          Don't have an account? <Link to="/register" style={{ color: '#ffd700' }}>Register here</Link>
        </p>
      </div>
    </div>
  );
}
