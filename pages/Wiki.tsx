import React from 'react';
import { Link } from 'react-router-dom';

const Wiki: React.FC = () => {
  return (
    <div className="container mx-auto px-4 max-w-6xl">
       <h1 className="text-5xl font-black text-center uppercase mb-16">База Знаний</h1>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <WikiCard 
             icon="fa-coins"
             title="Лидеры и Экономика"
             desc="Механики заработка Звезд, магазин косметики, поведение Лидеров мобов и система скиллов."
             link="/guide/plugin"
          />

          <WikiCard 
             icon="fa-dragon"
             title="Разломы и Боссы"
             desc="Как призвать магическую аномалию? Гайд по битвам с уникальными боссами и добыче редких Осколков."
             link="/guide/rifts"
          />

          <WikiCard 
             icon="fa-hammer"
             title="Кастомные Крафты"
             desc="Рецепты уникальных предметов, которых нет в ванильном майнкрафте. Крафт Генератора и Якоря."
             link="/crafts"
          />

          <WikiCard 
             icon="fa-compass"
             title="Путь Новичка"
             desc="С чего начать выживание? Как пройти Whitelist, как привязать аккаунт и какие моды установить."
             link="/guide/newbie"
          />

       </div>
    </div>
  );
};

interface WikiCardProps {
    icon: string;
    title: string;
    desc: string;
    link: string;
}

const WikiCard: React.FC<WikiCardProps> = ({ icon, title, desc, link }) => (
    <div className="bg-bgCard/80 border border-secondary/30 rounded-2xl p-8 hover:-translate-y-2 hover:bg-[#281e32]/90 hover:border-secondary hover:shadow-[0_10px_40px_rgba(165,79,248,0.2)] transition-all flex flex-col backdrop-blur-md">
        <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-4">
            <i className={`fas ${icon} text-secondary text-3xl`}></i>
            {title}
        </h3>
        <p className="text-gray-400 leading-relaxed mb-6 flex-grow">{desc}</p>
        <Link 
            to={link}
            className="block w-full py-3 bg-primary hover:bg-secondary text-white rounded-lg font-bold text-center transition-all shadow-md"
        >
            Читать статью
        </Link>
    </div>
);

export default Wiki;