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
  // Toast State
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  
  // Modal State
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
      
      {/* Toast Render */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-[3000] px-6 py-4 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border-l-4 animate-fade-in-up text-white font-bold flex items-center gap-3 backdrop-blur-md ${
          toast.type === 'error' 
            ? 'bg-red-900/80 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
            : 'bg-bgCard/90 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]'
        }`}>
           <i className={`fas ${toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}`}></i>
          {toast.message}
        </div>
      )}

      {/* Modern Game-Style Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[#050505]/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#120e1b] border border-[#A54FF8]/50 rounded-2xl w-full max-w-md p-0 shadow-[0_0_50px_rgba(165,79,248,0.25)] transform transition-all scale-100 overflow-hidden relative">
            
            {/* Modal Header Decoration */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#A54FF8] to-transparent"></div>
            
            <div className="p-8">
                <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-wide flex items-center gap-3">
                    {modal.type === 'alert' && <i className="fas fa-info-circle text-secondary"></i>}
                    {modal.type === 'confirm' && <i className="fas fa-question-circle text-accent"></i>}
                    {modal.type === 'prompt' && <i className="fas fa-pen text-secondary"></i>}
                    {modal.title}
                </h3>
                
                {modal.message && (
                    <p className="text-gray-300 mb-6 leading-relaxed border-l-2 border-white/10 pl-4 py-1">
                        {modal.message}
                    </p>
                )}
                
                {modal.type === 'prompt' && (
                <div className="mb-6">
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full bg-black/40 border border-[#2a2a33] rounded-lg p-4 text-white placeholder-gray-600 focus:outline-none focus:border-secondary focus:shadow-[0_0_15px_rgba(165,79,248,0.3)] transition-all font-medium"
                        placeholder={modal.inputPlaceholder}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') modal.onConfirm(inputRef.current?.value);
                        }}
                    />
                </div>
                )}

                <div className="flex justify-end gap-3 mt-4">
                {modal.type !== 'alert' && (
                    <button 
                    onClick={() => modal.onCancel()}
                    className="px-6 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 font-bold transition-colors uppercase text-xs tracking-wider"
                    >
                    Отмена
                    </button>
                )}
                <button 
                    onClick={() => modal.onConfirm(inputRef.current?.value)}
                    className="px-8 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-black uppercase text-xs tracking-widest hover:shadow-[0_0_20px_rgba(165,79,248,0.6)] hover:scale-105 transition-all transform"
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