import React, { useState, useEffect, useRef } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { logEvent } from 'firebase/analytics';
import { auth, analytics } from '../firebase';

interface AuthProps {
  navigate: (path: string) => void;
}

export default function Auth({ navigate }: AuthProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Track page view
  useEffect(() => {
    if (analytics) {
      logEvent(analytics, 'page_view', { page_title: 'Auth', page_location: '/auth' });
    }
  }, []);

  // Matrix rain animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let columns: Array<{ x: number; y: number; speed: number }> = [];
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/*-+[]{}&%@#";

    const initMatrixRain = () => {
      if (!canvas) return;
      const w = canvas.width = window.innerWidth;
      const h = canvas.height = window.innerHeight;
      const columnCount = Math.floor(w / 16);
      columns = [];
      for (let i = 0; i < columnCount; i++) {
        columns.push({
          x: i * 16,
          y: Math.random() * -h,
          speed: 2 + Math.random() * 4
        });
      }
    };

    const drawMatrixRain = () => {
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = 'rgba(9, 10, 15, 0.15)'; // Fading trail
      ctx.fillRect(0, 0, w, h);
      
      ctx.fillStyle = '#489EB5'; // Techblue text color
      ctx.font = '10px "JetBrains Mono"';
      
      columns.forEach(col => {
        const char = chars.charAt(Math.floor(Math.random() * chars.length));
        ctx.fillText(char, col.x, col.y);
        col.y += col.speed;
        if (col.y > h) {
          col.y = -20;
          col.speed = 2 + Math.random() * 4;
        }
      });
      
      animationFrameId = requestAnimationFrame(drawMatrixRain);
    };

    initMatrixRain();
    drawMatrixRain();

    const handleResize = () => initMatrixRain();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      let userCredential;
      if (authMode === 'register') {
        userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) {
          await updateProfile(userCredential.user, { displayName: name.trim() });
        }
        if (analytics) logEvent(analytics, 'sign_up', { method: 'email' });
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (analytics) logEvent(analytics, 'login', { method: 'email' });
      }

      const user = userCredential.user;
      const idToken = await user.getIdToken();
      
      // Save session keys to localStorage for simple client redirects
      localStorage.setItem('refine_token', idToken);
      localStorage.setItem('refine_username', user.displayName || name || email.split('@')[0]);
      localStorage.setItem('refine_email', user.email || '');

      triggerToast("Identity cleared. Launching workspace...");
      setTimeout(() => {
        navigate('/workbench');
      }, 1000);

    } catch (err: any) {
      console.error(err);
      const friendlyErrors: Record<string, string> = {
        'auth/email-already-in-use':   'An account with this email already exists.',
        'auth/invalid-email':           'Invalid email address format.',
        'auth/weak-password':           'Password must be at least 6 characters.',
        'auth/user-not-found':          'No account found with this email.',
        'auth/wrong-password':          'Incorrect password.',
        'auth/invalid-credential':      'Incorrect email or password.',
        'auth/too-many-requests':       'Too many attempts. Please try again later.',
        'auth/network-request-failed':  'Network error. Check your connection.',
      };
      setErrorMessage(friendlyErrors[err.code] || err.message || "Authentication failed.");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen font-sans text-gray-200 antialiased flex items-center justify-center p-4 bg-obsidian relative overflow-hidden">
      {/* Background Matrix Rain */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-15 pointer-events-none" />

      <div className="w-full max-w-md bg-lead border border-leadlight rounded-lg shadow-2xl overflow-hidden z-10">
        {/* Auth Header */}
        <div className="border-b border-leadlight bg-obsidian p-6 text-center select-none">
          <div className="w-10 h-10 rounded border border-electrum flex items-center justify-center font-display text-electrum font-bold text-lg select-none mx-auto mb-3">R</div>
          <h2 className="font-display text-xl font-bold tracking-tight text-white uppercase">Refine Gatekeeper</h2>
          <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mt-1">Identity & cryptology clearance</p>
        </div>

        {/* Form Mode Selector */}
        <div className="flex border-b border-leadlight font-mono text-xs cursor-pointer select-none">
          <button 
            type="button"
            onClick={() => { setAuthMode('login'); setErrorMessage(''); }}
            className={`flex-1 text-center py-3 border-b-2 uppercase ${authMode === 'login' ? 'border-electrum text-electrum font-semibold' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
          >
            Sign In
          </button>
          <button 
            type="button"
            onClick={() => { setAuthMode('register'); setErrorMessage(''); }}
            className={`flex-1 text-center py-3 border-b-2 uppercase ${authMode === 'register' ? 'border-electrum text-electrum font-semibold' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
          >
            Create Account
          </button>
        </div>

        {/* Auth Forms */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="bg-rust/10 border border-rust/40 text-rust p-3 rounded text-xs font-mono">
              [ALERT] {errorMessage}
            </div>
          )}

          {authMode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Full Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={authMode === 'register'} 
                placeholder="Alex Mercer"
                className="w-full bg-obsidian border border-leadlight rounded p-3 text-sm text-gray-200 focus:outline-none focus:border-electrum font-mono"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              placeholder="name@example.com"
              className="w-full bg-obsidian border border-leadlight rounded p-3 text-sm text-gray-200 focus:outline-none focus:border-electrum font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Password Credentials</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              placeholder="••••••••"
              className="w-full bg-obsidian border border-leadlight rounded p-3 text-sm text-gray-200 focus:outline-none focus:border-electrum font-mono"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-rust hover:bg-opacity-95 text-white py-3 rounded text-xs font-mono font-bold uppercase tracking-widest shadow-md transition-colors disabled:opacity-50"
          >
            {loading ? (authMode === 'login' ? 'AUTHENTICATING...' : 'CREATING USER...') : (authMode === 'login' ? 'Authorize Session' : 'Create New Profile')}
          </button>
        </form>

        <div className="bg-obsidian border-t border-leadlight px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="text-[10px] font-mono text-gray-500 hover:text-electrum transition-colors uppercase">
            ← Return to Landing Page
          </button>
        </div>
      </div>

      {/* Toast System */}
      <div className={`fixed bottom-6 left-6 bg-lead border border-electrum px-4 py-3 rounded shadow-2xl flex items-center space-x-3 text-xs font-mono transform transition-all duration-300 z-50 ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-electrum animate-ping"></span>
        <span className="text-gray-100">{toastMessage}</span>
      </div>
    </div>
  );
}
