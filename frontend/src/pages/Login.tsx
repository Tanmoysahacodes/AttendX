import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Hash, Eye, EyeOff, AlertCircle } from 'lucide-react';
import api from '../lib/api';

export default function Login() {
  const [mode, setMode] = useState<'player' | 'staff'>('player');
  const [name, setName] = useState('');
  const [jersey, setJersey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handlePlayerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login/player', { name: name.trim(), jerseyNumber: jersey.trim() });
      login(res.data.data.token, res.data.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Check your name and jersey number.');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.data.token, res.data.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-900/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-3xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(220,38,38,0.05)_0%,_transparent_70%)]" />
        </div>
      </div>

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-4">
            <img src="/logo.png" alt="AttendX Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-4xl font-black text-zinc-50 tracking-tight">Attend<span className="text-brand-500">X</span></h1>
          <p className="text-zinc-500 text-xs mt-2 tracking-[0.25em] uppercase">Team Attendance Platform</p>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 p-1 bg-surface-secondary rounded-xl mb-6 border border-surface-border">
          <button
            onClick={() => { setMode('player'); setError(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'player' ? 'bg-surface-card text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <User className="inline w-3.5 h-3.5 mr-1.5" />
            Player
          </button>
          <button
            onClick={() => { setMode('staff'); setError(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'staff' ? 'bg-surface-card text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Shield className="inline w-3.5 h-3.5 mr-1.5" />
            Staff
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-900/20 border border-red-900/40 text-red-400 text-sm p-3 rounded-lg mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Player Login Form */}
        {mode === 'player' && (
          <form onSubmit={handlePlayerLogin} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input pl-10"
                  required
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="label">Jersey Number</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="e.g. 07"
                  value={jersey}
                  onChange={e => setJersey(e.target.value)}
                  className="input pl-10"
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn-primary btn-lg w-full mt-2" disabled={loading}>
              {loading ? 'Entering...' : 'ENTER TEAM'}
            </button>
          </form>
        )}

        {/* Staff Login Form */}
        {mode === 'staff' && (
          <form onSubmit={handleStaffLogin} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input
                type="text"
                placeholder="admin / coach"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary btn-lg w-full mt-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        <p className="text-center text-zinc-600 text-xs mt-8">
          Sharda Sports Society · Team Attendance Platform
        </p>
      </div>
    </div>
  );
}
