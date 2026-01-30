import React from 'react';
import { Link } from 'react-router-dom';

const NewbieGuide: React.FC = () => {
  return (
    <div className="container mx-auto px-4 max-w-3xl">
       <div className="text-center mb-12">
          <h1 className="text-4xl font-black uppercase mb-2">Путь Новичка</h1>
          <p className="text-gray-400">Как начать играть на Vesperia SMP</p>
       </div>

       <div className="flex flex-col gap-8">
          <StepCard 
            icon="fa-video"
            title="1. Видео-заявка"
            content={<>Сервер приватный (Whitelist). Зайди в наш Discord и отправь <strong>видео-заявку</strong>. Расскажи о себе и планах на игру. После одобрения администрацией ты сможешь зайти.</>}
          />
          <StepCard 
            icon="fa-link"
            title="2. Вход и Привязка"
            content={<>IP сервера: <code className="bg-secondary/15 px-2 py-0.5 rounded text-white border border-secondary/30">play.vesperiasmp.ru</code>. При первом входе вас кикнет и выдаст код. Напишите <code>/link код</code> нашему боту в Discord.</>}
          />
          <StepCard 
            icon="fa-download"
            title="3. Установка модов"
            content={<>Версия: <strong>1.21.11</strong> (Fabric). Обязательно установите <strong>SimpleVoiceChat</strong> и <strong>Emotecraft</strong>.</>}
          />
          <StepCard 
            icon="fa-map-signs"
            title="4. Выживание"
            content={<><strong>НЕТ RTP</strong>. Используйте Незер-магистрали или элитры. Приватов нет, стройте далеко от спавна.</>}
          />
       </div>

       <div className="text-center mt-12">
         <Link to="/wiki" className="text-gray-500 hover:text-white font-bold border-b border-transparent hover:border-secondary transition-all">← Вернуться в Вики</Link>
       </div>
    </div>
  );
};

const StepCard: React.FC<{ icon: string; title: string; content: React.ReactNode }> = ({ icon, title, content }) => (
    <div className="bg-[#1e1e23]/80 border border-secondary/20 rounded-3xl p-8 flex gap-6 items-start backdrop-blur-sm transition-all hover:-translate-y-1 hover:bg-[#281e32]/90 hover:border-secondary">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-2xl">
           <i className={`fas ${icon}`}></i>
        </div>
        <div>
           <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
           <p className="text-gray-300 leading-relaxed">{content}</p>
        </div>
    </div>
);

export default NewbieGuide;