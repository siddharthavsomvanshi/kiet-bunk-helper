import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Panel } from '../components/UI';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/admin');
      }
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/admin');
    }
  };

  const inputStyle = {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(15, 23, 42, 0.1)',
    fontSize: '15px',
    width: '100%',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  };

  return (
    <section style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <Panel title="Admin Access" subtitle="Secure login for content management.">
          <form onSubmit={handleLogin} style={{ display: 'grid', gap: '16px', padding: '16px' }}>
            {error && (
              <div style={{ padding: '12px', borderRadius: '12px', background: '#fee2e2', color: '#991b1b', fontSize: '14px' }}>
                {error}
              </div>
            )}
            
            <div style={{ display: 'grid', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <div style={{ display: 'grid', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="action-button action-button--primary"
              style={{ padding: '14px', marginTop: '8px', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Authenticating...' : 'Login to Admin Panel'}
            </button>
          </form>
        </Panel>
      </div>
    </section>
  );
}
