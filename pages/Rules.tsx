import React from 'react';

const Rules: React.FC = () => {
  return (
    <div className="container mx-auto px-4 max-w-4xl">
      <h1 className="text-4xl md:text-5xl font-black text-center uppercase mb-12">Правила Сервера</h1>
      
      <div className="flex flex-col gap-6">
        
        <RuleCard icon="fa-server" title="1. Техническая часть и Поведение">
           <strong>Не ломайте сервер:</strong> Запрещено строить лаг-машины и создавать намеренную нагрузку (лаг-схемы, вечные двигатели без цели).<br/><br/>
           <strong>Ведите себя адекватно:</strong> Уважайте игроков, не будьте токсичными, играйте честно.
        </RuleCard>

        <RuleCard icon="fa-bomb" title="2. Гриферство">
           <ul className="list-disc pl-5 space-y-2 mb-4">
              <li>Гриф на сервере разрешен.</li>
              <li>Разрешается грифить при условии, что база игрока не будет разрушена более чем на <strong>50%</strong>.</li>
              <li>При грифе запрещено использовать Визеров.</li>
           </ul>
           <span className="inline-block text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded text-sm">
             Нарушение правил грифа = Бан + Откат разрушений
           </span>
        </RuleCard>

        <RuleCard icon="fa-microchip" title="3. Читы и Модификации">
           <p className="mb-4">Любое преимущество над другими игроками запрещено.</p>
           
           <div className="border-l-4 border-red-500 pl-4 py-2 bg-red-500/5 mb-4 rounded-r">
              <span className="text-red-500 font-bold block mb-2 text-sm uppercase"><i className="fas fa-times mr-2"></i> Запрещено (Бан)</span>
              <p className="text-sm text-gray-300 space-y-1">
                 <strong>Читы:</strong> Meteor, Impact, Aristois, Matix и любые другие.<br/>
                 <strong>Функции:</strong> X-Ray, KillAura, Fly, SpeedHack, ESP, Jesus, NoFall, FreeCam.<br/>
                 <strong>Боты:</strong> Baritone и скрипты для авто-добычи/рыбалки.<br/>
                 <strong>Ресурпаки:</strong> X-Ray (прозрачные текстуры).
              </p>
           </div>

           <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-500/5 rounded-r">
              <span className="text-green-500 font-bold block mb-2 text-sm uppercase"><i className="fas fa-check mr-2"></i> Разрешено</span>
              <p className="text-sm text-gray-300 space-y-1">
                 <strong>Оптимизация:</strong> OptiFine, Sodium, Lithium, Iris.<br/>
                 <strong>Визуал:</strong> Шейдеры, обычные ресурспаки.<br/>
                 <strong>Удобство:</strong> Litematica (только голограмма), MiniMap (без радара), Gamma.
              </p>
           </div>
        </RuleCard>

        <RuleCard icon="fa-comments" title="4. Чат и Реклама">
            <strong>Спам и Флуд:</strong>
            <ul className="list-disc pl-5 space-y-1 mt-2 mb-4 text-sm text-gray-300">
                <li>Запрещено засорять чат и отправлять однотипные сообщения.</li>
                <li>Запрещено злоупотреблять CAPS LOCK.</li>
                <li>Запрещен спам бессмысленными символами.</li>
            </ul>
            <strong>Реклама:</strong> Категорически запрещена реклама сторонних проектов.
        </RuleCard>

      </div>

      <div className="text-center text-gray-600 text-sm mt-12">
        Администрация оставляет за собой право изменять правила в любое время.
      </div>
    </div>
  );
};

const RuleCard: React.FC<{ icon: string; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-bgCard/85 border border-white/10 rounded-lg p-6 hover:bg-[#1e1e23]/95 hover:border-secondary transition-colors">
        <div className="flex items-center gap-4 border-b border-white/5 pb-3 mb-4">
            <i className={`fas ${icon} text-2xl text-secondary`}></i>
            <h3 className="text-xl font-bold text-white m-0">{title}</h3>
        </div>
        <div className="text-gray-300 leading-relaxed text-base">
            {children}
        </div>
    </div>
);

export default Rules;