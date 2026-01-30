import React from 'react';
import { Link } from 'react-router-dom';

const RiftsGuide: React.FC = () => {
  return (
    <div className="container mx-auto px-4 max-w-3xl">
       <div className="text-center mb-12">
          <h1 className="text-4xl font-black uppercase mb-2">Vesperia <span className="text-secondary">Rift</span></h1>
          <p className="text-gray-400">Новая механика попадания в Нижний Мир</p>
          <Link to="/wiki" className="inline-block mt-8 text-gray-500 hover:text-white font-bold border-b border-transparent hover:border-secondary transition-all">← Вернуться в Вики</Link>
       </div>

       <div className="flex flex-col gap-6">
          <GuideBlock icon="fa-atom" title="Что это такое?">
             <p className="mb-2">Забудьте про скучные рамки из обсидиана. На Vesperia порталы не работают.</p>
             <p>Чтобы попасть в Ад, нужно открыть <strong>Разлом</strong> — нестабильную аномалию, выглядящую как сгусток энергии. Разлом временный (20-40 минут).</p>
          </GuideBlock>

          <GuideBlock icon="fa-hammer" title="Ритуал Открытия">
             <ol className="list-decimal pl-5 space-y-2 text-gray-300">
                <li><strong>Фарм:</strong> Убивайте нежить, чтобы выбить <span className="bg-white/10 px-2 py-0.5 rounded text-white text-sm font-bold">Осколки Реальности</span>.</li>
                <li><strong>Крафт:</strong> Создайте <strong>Генератор Разлома</strong>.</li>
                <li><strong>Активация:</strong> Поставьте генератор. Есть шанс, что разлом откроется сразу.</li>
             </ol>
          </GuideBlock>

          <GuideBlock icon="fa-skull-crossbones" title="Риск: Искажённый Страж" iconColor="text-red-500">
             <p className="mb-2">Если активация не удалась, происходит взрыв и появляется <strong>Искажённый Страж</strong> — быстрый и живучий босс.</p>
             <p><strong>Награда:</strong> Победите Стража, чтобы вернуть потраченные осколки (Кэшбек).</p>
          </GuideBlock>

          <GuideBlock icon="fa-exchange-alt" title="Вход и Выход">
             <p className="mb-2"><strong>Вход:</strong> Коснитесь разлома. Вас перенесет в безопасную точку Ада.</p>
             <p><strong>Выход:</strong> При входе вы получите <span className="bg-white/10 px-2 py-0.5 rounded text-white text-sm font-bold">⚓ Нестабильный Якорь</span>. Используйте его (ПКМ), чтобы телепортироваться домой.</p>
          </GuideBlock>
       </div>
    </div>
  );
};

const GuideBlock: React.FC<{ icon: string; title: string; children: React.ReactNode; iconColor?: string }> = ({ icon, title, children, iconColor = 'text-secondary' }) => (
    <div className="bg-[#1e1e23]/80 border border-secondary/20 rounded-3xl p-8 flex gap-6 items-start backdrop-blur-sm transition-all hover:-translate-y-1 hover:bg-[#281e32]/90 hover:border-secondary">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-2xl">
           <i className={`fas ${icon} ${iconColor}`}></i>
        </div>
        <div className="flex-grow">
           <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
           <div className="text-gray-300 leading-relaxed">{children}</div>
        </div>
    </div>
);

export default RiftsGuide;