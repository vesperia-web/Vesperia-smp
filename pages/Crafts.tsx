import React from 'react';
import { Link } from 'react-router-dom';

const Crafts: React.FC = () => {
  return (
    <div className="container mx-auto px-4 max-w-3xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black uppercase mb-4">Кастомные <span className="text-secondary">Крафты</span></h1>
        <Link to="/wiki" className="text-gray-500 hover:text-white font-bold border-b border-transparent hover:border-secondary transition-all">
           ← Вернуться в Вики
        </Link>
      </div>

      <div className="bg-[#1e1e23]/85 border border-secondary/20 rounded-xl p-8 backdrop-blur-md flex flex-col items-center">
         <div className="text-2xl text-white mb-6 flex items-center gap-3">
            <i className="fas fa-cube text-accent"></i> Генератор Разлома
         </div>
         <p className="text-gray-400 text-center mb-8">
            Нужен для призыва аномалии. Осколки выпадают с нежити.
         </p>

         {/* Crafting Grid UI */}
         <div className="bg-[#c6c6c6] p-3 rounded border-2 border-[#555] shadow-inner flex flex-col md:flex-row items-center gap-6 relative">
            
            {/* 3x3 Grid */}
            <div className="grid grid-cols-3 gap-[2px]">
               {/* Row 1 */}
               <Slot item="shard" name="Осколок Реальности" rarity="rare" />
               <Slot item="shard" name="Осколок Реальности" rarity="rare" />
               <Slot item="shard" name="Осколок Реальности" rarity="rare" />
               
               {/* Row 2 */}
               <Slot item="shard" name="Осколок Реальности" rarity="rare" />
               <Slot item="obsidian" name="Плачущий Обсидиан" />
               <Slot item="shard" name="Осколок Реальности" rarity="rare" />

               {/* Row 3 */}
               <Slot item="shard" name="Осколок Реальности" rarity="rare" />
               <Slot item="shard" name="Осколок Реальности" rarity="rare" />
               <Slot item="shard" name="Осколок Реальности" rarity="rare" />
            </div>

            <div className="text-4xl text-[#555] font-bold transform rotate-90 md:rotate-0">➜</div>

            {/* Result */}
            <div className="w-[60px] h-[60px] bg-[#8b8b8b] border-2 border-[#555] flex justify-center items-center relative cursor-pointer group hover:bg-[#9d9d9d]">
               <img src="https://mcicons.ccleaf.com/assets/20.%20Blocks/33.%20Workplaces/Respawn_Anchor.png" alt="Result" className="w-10 h-10 pixelated block" />
               {/* Tooltip */}
               <div className="absolute bottom-[130%] left-1/2 -translate-x-1/2 bg-black/95 text-secondary border border-secondary px-3 py-1 rounded text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                 Генератор Разлома
               </div>
            </div>

         </div>
      </div>
    </div>
  );
};

interface SlotProps {
    item: 'shard' | 'obsidian';
    name: string;
    rarity?: 'rare';
}

const Slot: React.FC<SlotProps> = ({ item, name, rarity }) => {
    const imgUrl = item === 'shard' 
        ? "https://mcicons.ccleaf.com/assets/10.%20Items/21.%20Decoration/Amethyst_Shard.png"
        : "https://mcicons.ccleaf.com/assets/20.%20Blocks/18.%20Decoration/Crying_Obsidian.png";
    
    return (
        <div className="w-10 h-10 bg-[#8b8b8b] border-t-2 border-l-2 border-t-[#373737] border-l-[#373737] border-b-2 border-r-2 border-b-white border-r-white flex justify-center items-center relative cursor-pointer group hover:bg-[#9d9d9d]">
            <img src={imgUrl} alt={name} className="w-8 h-8 pixelated block" />
            
            {/* Tooltip */}
            <div className={`absolute bottom-[130%] left-1/2 -translate-x-1/2 bg-black/95 border border-secondary px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 ${rarity === 'rare' ? 'text-accent' : 'text-white'}`}>
                {name}
            </div>
        </div>
    )
}

export default Crafts;