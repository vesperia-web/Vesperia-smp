import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUI } from '../context/UIContext';
import { supabase } from '../services/supabase';

interface ServerStatus {
  online: boolean;
  players: {
    online: number;
    max: number;
  };
  version?: string;
}

const Home: React.FC = () => {
  const { showToast } = useUI();
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch Server Status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('https://api.mcsrvstat.us/3/play.vesperiasmp.ru');
        const data = await response.json();
        setStatus({
          online: data.online,
          players: {
            online: data.players?.online || 0,
            max: data.players?.max || 100
          },
          version: data.version
        });
      } catch (e) {
        console.error("Failed to fetch server status", e);
        setStatus({ online: false, players: { online: 0, max: 0 } });
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const copyIP = () => {
    navigator.clipboard.writeText("play.vesperiasmp.ru");
    showToast("IP скопирован! Ждем тебя на сервере.", "success");
  };

  const openDiscordInvite = () => {
    // Ссылка на дискорд
    window.open("https://discord.gg/vesperiasmp", "_blank");
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="min-h-[75vh] flex flex-col justify-center items-center text-center px-4 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-secondary/20 blur-[100px] rounded-full -z-10"></div>

        <img 
          src="https://i.postimg.cc/Pf4nb7xV/logo.png" 
          alt="Vesperia Logo" 
          className="w-32 h-32 md:w-48 md:h-48 rounded-[35px] shadow-[0_0_60px_rgba(98,61,202,0.4)] mb-8 border-2 border-secondary/30 animate-float object-cover"
        />
        
        <h1 className="text-4xl md:text-7xl font-black uppercase mb-2 tracking-tight">
          VESPERIA <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-primary">SMP</span>
        </h1>

        {/* Server Status Badge */}
        <div className="mb-8 flex items-center justify-center">
            {loading ? (
                <div className="text-gray-500 text-sm animate-pulse">Загрузка статуса...</div>
            ) : status?.online ? (
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                    <span className="text-green-400 font-bold text-sm tracking-wide">
                        ONLINE: {status.players.online} / {status.players.max}
                    </span>
                </div>
            ) : (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-red-400 font-bold text-sm tracking-wide">OFFLINE</span>
                </div>
            )}
        </div>
        
        <p className="text-gray-300 text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
          Приватный сервер с уникальной генерацией, магией разломов и экономикой на звездах.
        </p>

        <div className="flex flex-col md:flex-row items-center gap-6 w-full justify-center">
          <button 
            onClick={openDiscordInvite}
            className="w-full md:w-auto bg-[#5865F2] text-white px-8 py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-3 shadow-[0_10px_30px_rgba(88,101,242,0.3)] hover:transform hover:-translate-y-1 hover:bg-[#4752C4] hover:shadow-[0_15px_40px_rgba(88,101,242,0.5)] transition-all border border-white/10"
          >
            <i className="fab fa-discord text-2xl"></i> Наш Discord
          </button>

          <div 
            onClick={copyIP}
            className="w-full md:w-auto group bg-bgCard/50 backdrop-blur-md border border-secondary/30 px-8 py-4 rounded-xl text-lg font-mono text-accent cursor-pointer flex justify-center items-center gap-4 hover:bg-secondary/10 hover:border-secondary transition-all select-all"
          >
            <span>play.vesperiasmp.ru</span>
            <i className="fas fa-copy opacity-70 group-hover:opacity-100 transition-opacity"></i>
          </div>
        </div>
        
        <p className="mt-4 text-xs text-gray-500 max-w-md">
            * Чтобы зайти на сайт, используйте кнопку "Войти" в правом верхнем углу.
        </p>
      </section>

      {/* Cards Section */}
      <section className="py-20 px-2 md:px-10 max-w-7xl mx-auto">
        <h2 className="text-center text-3xl md:text-5xl font-black mb-16 uppercase">О Сервере</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="bg-bgCard/60 backdrop-blur-sm border border-white/5 p-8 rounded-2xl hover:-translate-y-2 hover:border-secondary hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all flex flex-col group">
            <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/30 transition-colors">
                 <i className="fas fa-comments text-3xl text-secondary"></i>
            </div>
            <h3 className="text-2xl font-bold mb-4">Живой Форум</h3>
            <p className="text-gray-400 leading-relaxed flex-grow mb-6">
              Общайся с игроками, предлагай идеи и читай новости сервера в реальном времени.
            </p>
            <Link to="/forum" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-lg font-bold text-center transition-all">
              Перейти на Форум
            </Link>
          </div>

          <div className="bg-bgCard/60 backdrop-blur-sm border border-white/5 p-8 rounded-2xl hover:-translate-y-2 hover:border-secondary hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all flex flex-col group">
            <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/30 transition-colors">
                <i className="fas fa-book-open text-3xl text-secondary"></i>
            </div>
            <h3 className="text-2xl font-bold mb-4">База Знаний</h3>
            <p className="text-gray-400 leading-relaxed flex-grow mb-6">
              Как попасть на сервер? Гайд по Whitelist, привязке аккаунта, кастомным крафтам и магии.
            </p>
            <Link to="/wiki" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-lg font-bold text-center transition-all">
              Открыть Вики
            </Link>
          </div>

          <div className="bg-bgCard/60 backdrop-blur-sm border border-white/5 p-8 rounded-2xl hover:-translate-y-2 hover:border-secondary hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all flex flex-col group">
            <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/30 transition-colors">
                <i className="fas fa-gem text-3xl text-secondary"></i>
            </div>
            <h3 className="text-2xl font-bold mb-4">Уникальный Лор</h3>
            <p className="text-gray-400 leading-relaxed flex-grow">
              Исследуй руины, сражайся с Искаженными боссами и открывай Разломы в другие миры.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
};

export default Home;