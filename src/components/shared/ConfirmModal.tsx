import React from 'react';
import { AlertCircle, Copy, Trash2, Info, X, CheckCircle2 } from 'lucide-react';

export type ConfirmModalType = 'danger' | 'info' | 'warning' | 'success';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    type?: ConfirmModalType;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    type = 'info',
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    let Icon = Info;
    let colorClass = 'text-blue-600';
    let bgClass = 'bg-blue-100';
    let btnClass = 'bg-blue-600 hover:bg-blue-700 text-white';

    if (type === 'danger') {
        Icon = Trash2;
        colorClass = 'text-red-600';
        bgClass = 'bg-red-100';
        btnClass = 'bg-red-600 hover:bg-red-700 text-white';
    } else if (type === 'warning') {
        Icon = AlertCircle;
        colorClass = 'text-amber-600';
        bgClass = 'bg-amber-100';
        btnClass = 'bg-amber-600 hover:bg-amber-700 text-white';
    } else if (type === 'success') {
        Icon = CheckCircle2;
        colorClass = 'text-green-600';
        bgClass = 'bg-green-100';
        btnClass = 'bg-green-600 hover:bg-green-700 text-white';
    } else if (type === 'info') {
        // Podríamos usar Copy si el texto incluye 'copia' o 'duplicar', pero lo mantendremos general
        if (title.toLowerCase().includes('copia') || title.toLowerCase().includes('duplicar')) {
            Icon = Copy;
            colorClass = 'text-indigo-600';
            bgClass = 'bg-indigo-100';
            btnClass = 'bg-indigo-600 hover:bg-indigo-700 text-white';
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onCancel}></div>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative z-10">
                <button 
                    onClick={onCancel}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X size={20} />
                </button>
                <div className="p-6 text-center pt-8">
                    <div className={`w-14 h-14 rounded-full ${bgClass} flex items-center justify-center mx-auto mb-5 shadow-sm`}>
                        <Icon className={colorClass} size={28} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-xl mb-2">{title}</h3>
                    <div className="text-slate-500 text-sm mb-8 leading-relaxed">
                        {message}
                    </div>
                    <div className="flex gap-3 justify-center">
                        <button 
                            onClick={onCancel} 
                            className="px-5 py-2.5 font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors w-full border border-slate-200"
                        >
                            {cancelText}
                        </button>
                        <button 
                            onClick={() => {
                                onConfirm();
                                onCancel();
                            }} 
                            className={`px-5 py-2.5 font-medium rounded-xl transition-colors w-full shadow-sm ${btnClass}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
