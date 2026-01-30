import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ToastType, ModalConfig } from '../types';

interface UIContextType {
  showToast: (message: string, type?: ToastType) => void;
  showAlert: (title: string, message: string) => Promise<void>;
  showConfirm: (title: string, message: string) => Promise<boolean>;
  showPrompt: (title: string, placeholder?: string) => Promise<string | null>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  
  const [modal, setModal] = useState<ModalConfig>({
    isOpen: false,
    type: 'alert',
    title: '',
    onConfirm: () => {},
    onCancel: () => {},
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  const showAlert = useCallback((title: string, message: string) => {
    return new Promise<void>((resolve) => {
      setModal({
        isOpen: true,
        type: 'alert',
        title,
        message,
        onConfirm: () => {
          closeModal();
          resolve();
        },
        onCancel: () => {
          closeModal();
          resolve();
        }
      });
    });
  }, []);

  const showConfirm = useCallback((title: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      setModal({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        onConfirm: () => {
          closeModal();
          resolve(true);
        },
        onCancel: () => {
          closeModal();
          resolve(false);
        }
      });
    });
  }, []);

  const showPrompt = useCallback((title: string, placeholder: string = '') => {
    return new Promise<string | null>((resolve) => {
      setModal({
        isOpen: true,
        type: 'prompt',
        title,
        inputPlaceholder: placeholder,
        onConfirm: (val) => {
          closeModal();
          resolve(val || '');
        },
        onCancel: () => {
          closeModal();
          resolve(null);
        }
      });
    });
  }, []);

  return (
    <UIContext.Provider value={{ showToast, showAlert, showConfirm, showPrompt }}>
      {children}
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-24 right-4 md:right-8 z-[3000] px-6 py-4 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.6)] border animate-fade-in-up text-white font-bold flex items-center gap-4 backdrop-blur-xl transition-all ${
          toast.type === 'error' 
            ? 'bg-red-950/80 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' 
            : 'bg-[#1a1a24]/80 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
        }`}>
           <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
               toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
           }`}>
               <i className={`fas ${toast.type === 'error' ? 'fa-exclamation' : 'fa-check'}`}></i>
           </div>
          {toast.message}
        </div>
      )}

      {/* Custom Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={closeModal}></div>
          
          <div className="bg-[#120e1b] border border-[#A54FF8] rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(165,79,248,0.3)] transform transition-all scale-100 overflow-hidden relative animate-fade-in-up z-10">
            
            {/* Top Gradient Line */}
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#A54FF8] to-transparent shadow-[0_0_10px_#A54FF8]"></div>
            
            <div className="p-6 md:p-8">
                <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-wide flex items-center gap-3 drop-shadow-lg">
                    {modal.type === 'alert' && <i className="fas fa-info-circle text-secondary"></i>}
                    {modal.type === 'confirm' && <i className="fas fa-question-circle text-accent"></i>}
                    {modal.type === 'prompt' && <i className="fas fa-pen text-secondary"></i>}
                    {modal.title}
                </h3>
                
                {modal.message && (
                    <p className="text-gray-300 mb-6 text-base leading-relaxed border-l-2 border-white/10 pl-4">
                        {modal.message}
                    </p>
                )}
                
                {modal.type === 'prompt' && (
                <div className="mb-6">
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full bg-[#050505] border border-[#2a2a33] rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-secondary focus:shadow-[0_0_15px_rgba(165,79,248,0.3)] transition-all font-medium"
                        placeholder={modal.inputPlaceholder}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') modal.onConfirm(inputRef.current?.value);
                        }}
                    />
                </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                {modal.type !== 'alert' && (
                    <button 
                    onClick={() => modal.onCancel()}
                    className="px-6 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 font-bold transition-colors uppercase text-xs tracking-wider"
                    >
                    Отмена
                    </button>
                )}
                <button 
                    onClick={() => modal.onConfirm(inputRef.current?.value)}
                    className="px-8 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-black uppercase text-xs tracking-widest hover:shadow-[0_0_20px_rgba(165,79,248,0.6)] hover:scale-105 transition-all transform border border-white/10"
                >
                    {modal.type === 'alert' ? 'Понятно' : 'Подтвердить'}
                </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used within UIProvider");
  return context;
};