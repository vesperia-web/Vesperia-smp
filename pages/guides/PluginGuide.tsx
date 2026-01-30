import React from 'react';
import { Link } from 'react-router-dom';

const PluginGuide: React.FC = () => {
  return (
    <div className="container mx-auto px-4 max-w-3xl">
       <div className="text-center mb-12">
          <h1 className="text-4xl font-black uppercase mb-2">Vesperia <span className="text-secondary">StarPL</span></h1>
          <Link to="/wiki" className="inline-block mt-8 text-gray-500 hover:text-white font-bold border-b border-transparent hover:border-secondary transition-all">← Вернуться в Вики</Link>
       </div>

       <div className="flex flex-col gap-6">
          <InfoCard icon="fa-star" title="Валюта: Звезды">
             <p className="mb-2">Внутренняя валюта сервера для покупки уникальной косметики. Баланс отображается в TAB и Scoreboard.</p>
             <strong>Как заработать:</strong>
             <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-300">
                <li>Убийство <strong>Монстров-Лидеров</strong>: 5–20 звезд.</li>
                <li>Убийство <strong>Вардена</strong>: 100–150 звезд (Кулдаун награды: 5 минут).</li>
                <li>Участие в ивентах сервера.</li>
             </ul>
          </InfoCard>

          <InfoCard icon="fa-skull" title="Монстры-Лидеры">
             <p className="mb-2">Особые мобы с пурпурным свечением, которые появляются вместо обычных. Опаснее стандартных врагов.</p>
             <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-300">
                <li><strong>Характеристики:</strong> x2 Здоровье, повышенная скорость.</li>
                <li><strong>Крипер-Лидер:</strong> Огромный радиус взрыва (9 блоков).</li>
                <li><strong>Ведьма-Лидер:</strong> Использует усиленные зелья.</li>
             </ul>
          </InfoCard>

          <InfoCard icon="fa-magic" title="Система Косметики">
             <p className="mb-2">Используйте команду <code>/cosmetics</code>, чтобы открыть магазин. Цены от 100 до 15 000 звезд.</p>
             <strong className="block mt-2">Категории:</strong>
             <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-300">
                 <li><strong>HEAD:</strong> Нимбы, короны, рога, уши.</li>
                 <li><strong>WINGS:</strong> Объемные 3D крылья.</li>
                 <li><strong>BODY:</strong> Ауры (Спирали, Щиты).</li>
                 <li><strong>TRAILS:</strong> Следы при ходьбе.</li>
             </ul>
             <p className="mt-4 text-sm">
                 <strong>Редкость:</strong> <span className="text-white font-bold">Обычная</span>, <span className="text-[#A54FF8] font-bold">Эпическая</span>, <span className="text-[#FFD700] font-bold">Мифическая</span>, <span className="text-cyan-400 font-bold">Божественная</span>.
             </p>
          </InfoCard>
       </div>
    </div>
  );
};

const InfoCard: React.FC<{ icon: string; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-[#1e1e23]/80 border border-secondary/20 rounded-3xl p-8 flex gap-6 items-start backdrop-blur-sm transition-all hover:-translate-y-1 hover:bg-[#281e32]/90 hover:border-secondary">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-2xl">
           <i className={`fas ${icon}`}></i>
        </div>
        <div className="flex-grow">
           <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
           <div className="text-gray-300 leading-relaxed">{children}</div>
        </div>
    </div>
);

export default PluginGuide;