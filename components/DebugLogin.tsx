import React from 'react';
import { supabase } from '../services/supabase';
import { useUI } from '../context/UIContext';

const DebugLogin: React.FC = () => {
  const { showToast, showAlert } = useUI();

  const handleTestLogin = async () => {
    // 1. Исправили опечатку в почте
    const email = "sharks.shark.d@gmail.com";
    const password = "dev_password_123";

    showToast("DEV: Подключение...", "info");

    // 2. Сначала пробуем просто ВОЙТИ
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInData.session) {
      showToast(`Привет, Админ!`);
      window.location.reload();
      return;
    }

    // 3. Если войти не удалось, пробуем СОЗДАТЬ аккаунт
    // Ставим имя _shark2011, чтобы форум считал тебя админом
    console.log("Создаю аккаунт...", signInError?.message);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: "_shark2011", 
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=shark_admin&backgroundColor=b6e3f4`,
        },
      },
    });

    if (signUpError) {
      console.error(signUpError);
      
      if (signUpError.message.includes("already registered")) {
          // Если пишет "уже зарегистрирован", но пароль выше не подошел,
          // значит этот аккаунт создан через Discord или с другим паролем.
          showAlert(
             "Вход не удался", 
             "Этот Email уже занят, но пароль не подходит. Скорее всего, ты регистрировал его через Discord. Нажми кнопку 'Войти через Discord' на главной."
          );
      } else if (signUpError.message.includes("rate limit")) {
          showAlert(
             "Лимит запросов", 
             "Supabase все еще блокирует этот IP или почту. Попробуй через 1 час или используй вход через Discord."
          );
      } else if (signUpError.message.includes("signups are disabled")) {
          showAlert("Ошибка", "Включи 'Enable Email provider' в Supabase.");
      } else {
          showAlert("Ошибка создания", signUpError.message);
      }
      return;
    }

    if (signUpData.session) {
        showToast(`Аккаунт создан! Вы Админ.`);
        window.location.reload();
    } else if (signUpData.user) {
        showAlert(
            "Подтверди почту", 
            "Аккаунт создан, но нужно подтверждение. Зайди в Supabase -> Auth -> Providers -> Email и сними галочку 'Confirm email', затем попробуй снова."
        );
    }
  };

  return (
    <button
      onClick={handleTestLogin}
      className="fixed bottom-4 left-4 z-[1000] bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded shadow-lg border-2 border-red-400 opacity-80 hover:opacity-100 transition-all text-xs uppercase"
    >
      <i className="fas fa-crown mr-2"></i> DEV: Shark Login
    </button>
  );
};

export default DebugLogin;