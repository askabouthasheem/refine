import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import Landing from './components/Landing';
import Auth from './components/Auth';
import Workbench from './components/Workbench';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    
    // Intercept local link clicks for SPA feel
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (
        anchor && 
        anchor.href && 
        anchor.host === window.location.host && 
        !anchor.getAttribute('target') &&
        !anchor.href.includes('#')
      ) {
        e.preventDefault();
        window.history.pushState({}, '', anchor.pathname);
        setCurrentPath(anchor.pathname);
      }
    };
    document.addEventListener('click', handleLinkClick);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      document.removeEventListener('click', handleLinkClick);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-obsidian text-electrum font-mono">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded border border-electrum flex items-center justify-center font-display text-electrum font-bold text-xl select-none animate-pulse mx-auto">R</div>
          <div className="tracking-widest uppercase text-xs">Initializing core...</div>
        </div>
      </div>
    );
  }

  // Auth Guard for Workbench
  if (currentPath === '/workbench' && !user) {
    setTimeout(() => navigate('/auth'), 0);
    return null;
  }

  // Redirect logged in users away from auth
  if (currentPath === '/auth' && user) {
    setTimeout(() => navigate('/workbench'), 0);
    return null;
  }

  switch (currentPath) {
    case '/auth':
      return <Auth navigate={navigate} />;
    case '/workbench':
      return <Workbench navigate={navigate} user={user} />;
    default:
      return <Landing navigate={navigate} user={user} />;
  }
}

export default App;
