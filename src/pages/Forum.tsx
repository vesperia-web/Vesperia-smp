import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useUI } from '../context/UIContext';
import { Topic, Post, Profile } from '../types';

const ADMIN_NAME = "_shark2011";

const Forum: React.FC = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const { showPrompt, showAlert, showToast, showConfirm } = useUI();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });
    loadTopics();
  }, []);

  const loadTopics = async () => {
    const { data, error } = await supabase
      .from('topics')
      .select(`
        *,
        profiles (username)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return;
    }
    setTopics(data as unknown as Topic[]);
  };

  const loadPosts = async (topicId: number) => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (*)
      `)
      .eq('topic_id', topicId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(error);
      return;
    }
    setPosts(data as unknown as Post[]);
  };

  const handleCreateTopic = async () => {
    if (!currentUser) {
      showAlert("Внимание", "Вы должны войти в аккаунт, чтобы создавать темы.");
      return;
    }

    const title = await showPrompt("Новая тема", "Введите название темы...");
    if (!title) return;

    const { error } = await supabase
      .from('topics')
      .insert([{ title, author_id: currentUser.id }]);

    if (error) {
      console.error("Create Topic Error:", error);
      // Улучшенное сообщение об ошибке
      showAlert(
          "Ошибка доступа", 
          "Вы не можете создать тему, потому что база данных заблокирована. Попросите администратора выполнить 'SUPABASE_SETUP.sql' в консоли Supabase, чтобы разрешить доступ."
      );
    } else {
      showToast("Тема создана!");
      loadTopics();
    }
  };

  const handleOpenTopic = (topic: Topic) => {
    setActiveTopic(topic);
    loadPosts(topic.id);
  };

  const handleReply = async (content: string) => {
    if (!currentUser || !activeTopic) return;
    
    const { error } = await supabase
      .from('posts')
      .insert([{ topic_id: activeTopic.id, author_id: currentUser.id, content }]);

    if (error) {
       showAlert("Ошибка", "Не удалось отправить сообщение. Проверьте права доступа (RLS).");
    } else {
       loadPosts(activeTopic.id);
       return true; // Success
    }
    return false;
  };

  const handleDeletePost = async (id: number) => {
    const confirmed = await showConfirm("Удаление", "Вы уверены, что хотите удалить этот пост?");
    if (confirmed) {
        await supabase.from('posts').delete().eq('id', id);
        if (activeTopic) loadPosts(activeTopic.id);
    }
  };

  // Render Topic List
  if (!activeTopic) {
    return (
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex justify-between items-center mb-8 border-b border-borderColor pb-5">
          <h1 className="text-4xl font-black uppercase">Форум</h1>
          <button 
            onClick={handleCreateTopic}
            className="bg-primary hover:bg-secondary text-white px-6 py-3 rounded-md font-bold transition-all shadow-lg flex items-center gap-2"
          >
            <i className="fas fa-plus"></i> Создать тему
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {topics.length === 0 && <div className="text-gray-500 text-center py-10">Тем пока нет. Будьте первым!</div>}
          
          {topics.map(topic => (
            <div 
              key={topic.id}
              onClick={() => handleOpenTopic(topic)}
              className="bg-bgCard border border-borderColor rounded-xl p-6 cursor-pointer hover:bg-secondary/5 hover:border-secondary transition-all flex justify-between items-center group"
            >
              <div>
                <h3 className="text-xl font-bold text-secondary mb-2 group-hover:text-white transition-colors">{topic.title}</h3>
                <div className="text-sm text-gray-500">
                  Автор: <span className="text-gray-300">{topic.profiles?.username || 'Неизвестный'}</span> | {new Date(topic.created_at).toLocaleDateString()}
                </div>
              </div>
              <i className="fas fa-chevron-right text-gray-600 group-hover:text-white transition-colors"></i>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render Single Topic
  return (
    <div className="container mx-auto px-4 max-w-5xl">
       <button 
         onClick={() => setActiveTopic(null)}
         className="text-gray-500 hover:text-white font-bold mb-6 flex items-center gap-2 transition-colors"
       >
         <i className="fas fa-arrow-left"></i> Ко всем темам
       </button>

       <h2 className="text-3xl font-black text-secondary mb-8 border-b border-borderColor pb-4">{activeTopic.title}</h2>

       <div className="flex flex-col gap-6 mb-10">
         {posts.length === 0 && <div className="text-center text-gray-500">Нет сообщений.</div>}
         
         {posts.map(post => {
            const isAdmin = post.profiles?.is_admin || post.profiles?.username === ADMIN_NAME;
            const isMeAdmin = currentUser?.user_metadata?.full_name === ADMIN_NAME; // simplified check
            
            return (
              <div key={post.id} className="bg-bgCard border border-borderColor rounded-xl p-6 flex flex-col md:flex-row gap-6">
                 <div className="flex-shrink-0 flex flex-col items-center w-full md:w-32">
                    <img 
                      src={post.profiles?.avatar_url || 'https://i.postimg.cc/Pf4nb7xV/logo.png'} 
                      alt="avatar" 
                      className="w-20 h-20 rounded-full border-2 border-borderColor mb-3 object-cover"
                    />
                    <div className="font-bold text-center break-words w-full">{post.profiles?.username || 'Игрок'}</div>
                    {isAdmin && <span className="mt-2 text-[0.7rem] bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded font-black uppercase">Admin</span>}
                 </div>
                 
                 <div className="flex-grow">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
                      <small className="text-gray-500">{new Date(post.created_at).toLocaleString()}</small>
                      {isMeAdmin && (
                        <button onClick={() => handleDeletePost(post.id)} className="text-red-500 hover:text-red-400 text-xs border border-red-500/50 px-2 py-1 rounded hover:bg-red-500/10">
                           Удалить
                        </button>
                      )}
                    </div>
                    <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {post.content}
                    </p>
                 </div>
              </div>
            )
         })}
       </div>

       {currentUser ? (
         <div className="bg-bgCard border border-borderColor rounded-xl p-6">
            <h3 className="font-bold mb-4">Ваш ответ</h3>
            <ReplyForm onSubmit={handleReply} />
         </div>
       ) : (
         <div className="text-center p-6 bg-white/5 rounded-xl text-gray-400">
           Войдите, чтобы ответить.
         </div>
       )}
    </div>
  );
};

const ReplyForm: React.FC<{ onSubmit: (text: string) => Promise<boolean | undefined> }> = ({ onSubmit }) => {
    const [text, setText] = useState('');
    
    const handleSubmit = async () => {
        if (!text.trim()) return;
        const success = await onSubmit(text);
        if (success) setText('');
    };

    return (
        <div>
            <textarea 
                className="w-full bg-black/30 border border-borderColor rounded-lg p-4 text-white focus:outline-none focus:border-secondary transition-colors h-32 mb-4"
                placeholder="Введите сообщение..."
                value={text}
                onChange={e => setText(e.target.value)}
            />
            <button 
                onClick={handleSubmit}
                className="bg-primary hover:bg-secondary text-white px-6 py-2 rounded font-bold transition-all"
            >
                Отправить
            </button>
        </div>
    )
}

export default Forum;