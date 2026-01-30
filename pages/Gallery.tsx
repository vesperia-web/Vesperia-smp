import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useUI } from '../context/UIContext';
import { GalleryImage, User } from '../types';

// Список админов
const ADMINS = ['_shark2011', 'r_leynar'];

const Gallery: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { showToast, showPrompt, showConfirm } = useUI();

  // Проверка админа
  const isAdmin = user && ADMINS.includes(user.user_metadata.full_name || user.user_metadata.name || '');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser((session?.user as User) ?? null);
    });
    fetchImages();
  }, []);

  const fetchImages = async () => {
    const { data, error } = await supabase
      .from('gallery')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching gallery:', error);
    } else {
      setImages(data as GalleryImage[]);
    }
  };

  const handleAddImage = async () => {
    // 1. Спрашиваем ссылку
    const url = await showPrompt("Ссылка на картинку", "Вставьте ссылку (например, из Discord или Imgur)");
    if (!url) return;

    // Простая проверка, что это картинка
    if (!url.match(/\.(jpeg|jpg|gif|png|webp)$/i) && !url.includes('cdn.discordapp.com') && !url.includes('media.discordapp.net')) {
        showToast("Это не похоже на прямую ссылку на картинку", "error");
        return;
    }

    // 2. Спрашиваем название
    const title = await showPrompt("Название / Описание", "Например: База клана");
    if (!title) return;

    setLoading(true);

    try {
      // 3. Сохраняем ТОЛЬКО ссылку в базу (не тратим место в хранилище)
      const { error } = await supabase
        .from('gallery')
        .insert([{
          url: url,
          title: title,
          author_id: user!.id
        }]);

      if (error) throw error;

      showToast("Фото добавлено!", "success");
      fetchImages();

    } catch (error: any) {
      console.error(error);
      showToast("Ошибка: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm("Удалить фото?", "Восстановить будет нельзя.");
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('gallery').delete().eq('id', id);
      if (error) throw error;

      showToast("Фото удалено из галереи", "success");
      setImages(prev => prev.filter(img => img.id !== id));

    } catch (error: any) {
       showToast("Ошибка: " + error.message, "error");
    }
  };

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black uppercase mb-4">Галерея <span className="text-secondary">Мира</span></h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Хроники нашего сервера. История в каждом пикселе.
          </p>
      </div>
      
      {/* Admin Controls */}
      {isAdmin && (
        <div className="mb-10 flex justify-center">
             <button 
                onClick={handleAddImage}
                disabled={loading}
                className={`bg-gradient-to-r from-primary to-secondary text-white px-8 py-4 rounded-xl font-bold shadow-[0_0_20px_rgba(165,79,248,0.4)] hover:scale-105 transition-all flex items-center gap-3 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
                <i className="fas fa-link"></i> Добавить фото (По ссылке)
             </button>
        </div>
      )}

      {images.length === 0 && (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl bg-white/5">
              <i className="fas fa-images text-4xl text-gray-600 mb-4"></i>
              <p className="text-gray-500">Галерея пока пуста.</p>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((item) => (
          <div key={item.id} className="group relative overflow-hidden rounded-xl border border-white/10 shadow-lg aspect-video bg-bgCard hover:border-secondary/50 transition-all duration-500">
            <img 
              src={item.url} 
              alt={item.title} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
              onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Error';
              }}
            />
            
            {/* Overlay Info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                <span className="text-white font-bold text-lg translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-black drop-shadow-md">{item.title}</span>
                <span className="text-secondary text-xs uppercase tracking-wider translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                    {new Date(item.created_at).toLocaleDateString()}
                </span>
            </div>

            {/* Admin Delete Button */}
            {isAdmin && (
                <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                    className="absolute top-3 right-3 bg-red-500/80 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 shadow-lg cursor-pointer"
                    title="Удалить фото"
                >
                    <i className="fas fa-trash text-xs"></i>
                </button>
            )}
            
            {/* Border Glow on Hover */}
            <div className="absolute inset-0 border-2 border-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Gallery;