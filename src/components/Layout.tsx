import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { User } from '../types';
import { useUI } from '../context/UIContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const location = useLocation();
  const { showToast } = useUI();

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser((session?.user as User) ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser((session?.user as User) ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Star Background Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let stars: Star[] = [];
    const mouse = { x: 0, y: 0 };

    class Star {
      x: number;
      y: number;
      z: number;
      size: number;
      opacity: number;
      fadeDir: number;
      color: string;
      
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.z = Math.random() * 2 + 0.5;
        this.size = Math.random() * 2;
        this.opacity = Math.random();
        this.fadeDir = 0.008 * (Math.random() > 0.5 ? 1 : -1);
        this.color = Math.random() > 0.8 ? '#A54FF8' : '#FFFFFF';
      }
      
      update() {
        let dx = (width / 2 - mouse.x) * 0.02 * (this.z * 0.1);
        let dy = (height / 2 - mouse.y) * 0.02 * (this.z * 0.1);
        
        this.opacity += this.fadeDir;
        if (this.opacity > 1 || this.opacity < 0.3) this.fadeDir *= -1;
        
        ctx!.fillStyle = this.color;
        ctx!.globalAlpha = this.opacity;
        ctx!.beginPath();
        ctx!.arc(this.x + dx, this.y + dy, this.size * this.z * 0.4, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.globalAlpha = 1.0;
      }
    }

    for (let i = 0; i < 200; i++) stars.push(new Star());

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      stars.forEach(s => s.update());
      requestAnimationFrame(animate);
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      stars = [];
      for (let i = 0; i < 200; i++) stars.push(new Star());
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { 
        redirectTo: window.location.origin 
      },
    });
    if (error) {
        console.error(error);
        showToast("Ошибка входа: " + error.message, 'error');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showToast('Вы вышли из аккаунта');
    setMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path ? 'text-white border-b-2 border-secondary pb-1 shadow-[0_4px_10px_rgba(165,79,248,0.3)]' : 'text-gray-400 hover:text-white';

  // Fallback for avatar
  const avatarUrl = user?.user_metadata?.avatar_url || 'https://i.postimg.cc/Pf4nb7xV/logo.png';
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Игрок';

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none"
      />

      {/* Main Navigation */}
      <nav className="fixed top-0 left-0 w-full h-20 z-50 flex justify-between items-center px-6 md:px-12 bg-[#0a0a0c]/80 border-b border-borderColor backdrop-blur-xl shadow-lg">
        <Link to="/" className="text-2xl font-black uppercase tracking-widest text-white decoration-none flex items-center gap-2 group">
          <img src="https://i.postimg.cc/Pf4nb7xV/logo.png" className="w-10 h-10 rounded-lg border border-secondary group-hover:rotate-12 transition-transform" alt="" />
          <div>Vesperia <span className="text-secondary drop-shadow-[0_0_5px_rgba(165,79,248,0.8)]">SMP</span></div>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-8 items-center">
          <Link to="/" className={`font-bold text-sm uppercase transition-all tracking-wide ${isActive('/')}`}>Главная</Link>
          <Link to="/gallery" className={`font-bold text-sm uppercase transition-all tracking-wide ${isActive('/gallery')}`}>Галерея</Link>
          <Link to="/forum" className={`font-bold text-sm uppercase transition-all tracking-wide ${isActive('/forum')}`}>Форум</Link>
          <Link to="/wiki" className={`font-bold text-sm uppercase transition-all tracking-wide ${isActive('/wiki')}`}>Вики</Link>
          <Link to="/rules" className={`font-bold text-sm uppercase transition-all tracking-wide ${isActive('/rules')}`}>Правила</Link>
          
          {user ? (
            <div className="relative group">
              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-white/5 px-3 py-1.5 rounded-full border border-transparent hover:border-secondary/30 transition-all"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                  <span className="font-bold text-sm text-right hidden lg:block text-white">
                      {userName}
                  </span>
                  <img 
                    src={avatarUrl} 
                    alt="Avatar" 
                    className="w-9 h-9 rounded-full border-2 border-secondary object-cover shadow-[0_0_10px_rgba(165,79,248,0.5)]"
                  />
              </div>
              
              {/* Dropdown */}
              <div className="absolute top-14 right-0 bg-bgCard border border-borderColor rounded-xl p-2 w-56 shadow-[0_10px_40px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform translate-y-2 group-hover:translate-y-0">
                   <div className="lg:hidden text-center pb-2 border-b border-white/10 mb-2 font-bold truncate text-white px-2">
                     {userName}
                   </div>
                   <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-red-400 hover:text-white hover:bg-red-500/20 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                     <i className="fas fa-sign-out-alt"></i> Выйти
                   </button>
              </div>
            </div>
          ) : (
            <button onClick={handleLogin} className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-[0_0_15px_rgba(88,101,242,0.4)] hover:shadow-[0_0_25px_rgba(88,101,242,0.6)] flex items-center gap-2 border border-[#5865F2]">
              <i className="fab fa-discord"></i> Войти
            </button>
          )}
        </div>

        {/* Mobile Toggle & Avatar */}
        <div className="md:hidden flex items-center gap-4">
           {user && (
             <img 
               src={avatarUrl} 
               alt="User" 
               className="w-8 h-8 rounded-full border border-secondary shadow-[0_0_10px_rgba(165,79,248,0.4)]"
               onClick={() => setMenuOpen(!menuOpen)}
             />
           )}
           <button className="text-2xl text-white focus:outline-none" onClick={() => setMenuOpen(!menuOpen)}>
               <i className={`fas ${menuOpen ? 'fa-times' : 'fa-bars'} text-secondary`}></i>
           </button>
        </div>
      </nav>
      
       {/* Mobile Menu Dropdown */}
       {menuOpen && (
        <div className="md:hidden fixed top-20 left-0 w-full bg-[#0a0a0c]/95 backdrop-blur-xl border-b border-borderColor z-40 p-6 flex flex-col gap-6 shadow-2xl animate-fade-in-up">
           <Link to="/" onClick={() => setMenuOpen(false)} className="text-white font-bold text-lg flex justify-between items-center border-b border-white/5 pb-2">Главная <i className="fas fa-chevron-right text-xs text-gray-500"></i></Link>
           <Link to="/gallery" onClick={() => setMenuOpen(false)} className="text-white font-bold text-lg flex justify-between items-center border-b border-white/5 pb-2">Галерея <i className="fas fa-chevron-right text-xs text-gray-500"></i></Link>
           <Link to="/forum" onClick={() => setMenuOpen(false)} className="text-white font-bold text-lg flex justify-between items-center border-b border-white/5 pb-2">Форум <i className="fas fa-chevron-right text-xs text-gray-500"></i></Link>
           <Link to="/wiki" onClick={() => setMenuOpen(false)} className="text-white font-bold text-lg flex justify-between items-center border-b border-white/5 pb-2">Вики <i className="fas fa-chevron-right text-xs text-gray-500"></i></Link>
           <Link to="/rules" onClick={() => setMenuOpen(false)} className="text-white font-bold text-lg flex justify-between items-center border-b border-white/5 pb-2">Правила <i className="fas fa-chevron-right text-xs text-gray-500"></i></Link>
           
           {user ? (
             <div className="flex flex-col gap-4 mt-2 bg-white/5 p-4 rounded-xl">
                 <div className="flex items-center gap-3">
                    <img src={avatarUrl} className="w-12 h-12 rounded-full border border-secondary" />
                    <span className="font-bold text-white text-lg">{userName}</span>
                 </div>
                 <button onClick={handleLogout} className="text-red-400 font-bold text-left text-lg flex items-center gap-2 mt-2">
                    <i className="fas fa-sign-out-alt"></i> Выйти
                 </button>
             </div>
           ) : (
             <button onClick={() => { handleLogin(); setMenuOpen(false); }} className="w-full bg-[#5865F2] text-white py-3 rounded-xl font-bold text-lg shadow-lg flex justify-center items-center gap-2">
                <i className="fab fa-discord"></i> Войти через Discord
             </button>
           )}
        </div>
      )}

      <main className="pt-28 pb-12 min-h-screen px-4">
        {children}
      </main>

      <footer className="text-center py-10 bg-[#050505] border-t border-borderColor mt-auto px-4 relative z-10">
        <p className="text-gray-400 font-medium mb-2">&copy; 2026 Vesperia SMP. Все права защищены.</p>
        <p className="text-[10px] md:text-xs text-gray-600 max-w-2xl mx-auto uppercase tracking-wide font-bold">
            Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.
        </p>
      </footer>
    </>
  );
};

export default Layout;