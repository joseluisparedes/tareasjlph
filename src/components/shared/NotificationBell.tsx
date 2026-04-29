import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Calendar, Clock, AlertCircle } from 'lucide-react';
import { ITRequest } from '../../types';

interface NotificationBellProps {
    requests: ITRequest[];
    onNotificationClick: (requestId: string) => void;
}

interface AlertGroup {
    id: string;
    title: string;
    items: {
        id: string;
        message: string;
        requestId?: string;
    }[];
    type: 'danger' | 'warning' | 'info';
    icon: React.ReactNode;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ requests, onNotificationClick }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [alerts, setAlerts] = useState<AlertGroup[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Cerrar menú al hacer clic afuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const parseDate = (dateStr?: string) => {
            if (!dateStr) return null;
            const parts = dateStr.split('-');
            if (parts.length !== 3) return null;
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        };

        const isSameDay = (d1: Date | null, d2: Date) => {
            if (!d1) return false;
            return d1.getTime() === d2.getTime();
        };

        const isPastDate = (d1: Date | null, d2: Date) => {
            if (!d1) return false;
            return d1.getTime() < d2.getTime();
        };

        const isClosed = (status: string) => {
            const s = status.toLowerCase();
            return s.includes('cerrad') || s.includes('completad') || s.includes('terminad') || s.includes('cancelad') || s.includes('desestimad');
        };

        const newAlerts: AlertGroup[] = [];

        // 1. Iniciativas Hoy (Inicio o Fin)
        const hoyItems = requests.filter(r => !isClosed(r.status)).filter(r => {
            const fInicio = parseDate(r.fechaInicio);
            const fFin = parseDate(r.fechaFin);
            return isSameDay(fInicio, today) || isSameDay(fFin, today);
        }).map(r => {
            const fInicio = parseDate(r.fechaInicio);
            const tipo = isSameDay(fInicio, today) ? 'empieza' : 'termina';
            return {
                id: r.id,
                message: `${r.id}: ${r.title} ${tipo} hoy.`,
                requestId: r.id
            };
        });

        if (hoyItems.length > 0) {
            newAlerts.push({
                id: 'hoy',
                title: 'Empiezan/Terminan Hoy',
                type: 'warning',
                icon: <Calendar size={16} className="text-orange-500" />,
                items: hoyItems
            });
        }

        // 2. Iniciativas Mañana (Inicio o Fin)
        const mananaItems = requests.filter(r => !isClosed(r.status)).filter(r => {
            const fInicio = parseDate(r.fechaInicio);
            const fFin = parseDate(r.fechaFin);
            return isSameDay(fInicio, tomorrow) || isSameDay(fFin, tomorrow);
        }).map(r => {
            const fInicio = parseDate(r.fechaInicio);
            const tipo = isSameDay(fInicio, tomorrow) ? 'empieza' : 'termina';
            return {
                id: r.id,
                message: `${r.id}: ${r.title} ${tipo} mañana.`,
                requestId: r.id
            };
        });

        if (mananaItems.length > 0) {
            newAlerts.push({
                id: 'manana',
                title: 'Empiezan/Terminan Mañana',
                type: 'info',
                icon: <Clock size={16} className="text-blue-500" />,
                items: mananaItems
            });
        }

        // 3. Acumulación por Dirección (> 10)
        const counts: Record<string, { count: number, requestIds: string[] }> = {};
        requests.filter(r => !isClosed(r.status)).forEach(r => {
            if (r.direccionSolicitante && r.status) {
                const key = `${r.direccionSolicitante} | ${r.status}`;
                if (!counts[key]) counts[key] = { count: 0, requestIds: [] };
                counts[key].count++;
                counts[key].requestIds.push(r.id);
            }
        });

        const acumulacionItems = Object.entries(counts)
            .filter(([_, val]) => val.count > 10)
            .map(([key, val], index) => {
                const [direccion, estado] = key.split(' | ');
                return {
                    id: `acum-${index}`,
                    message: `${direccion} tiene ${val.count} iniciativas en estado "${estado}".`,
                    // Mostrar solo la primera para revisar o podríamos no enviar requestId y solo mostrar la info
                    requestId: val.requestIds[0] 
                };
            });

        if (acumulacionItems.length > 0) {
            newAlerts.push({
                id: 'acumulacion',
                title: 'Acumulación de Iniciativas',
                type: 'danger',
                icon: <AlertTriangle size={16} className="text-red-500" />,
                items: acumulacionItems
            });
        }

        // 4. Atrasadas (Fecha Fin < Hoy y no cerrado)
        const atrasadasItems = requests.filter(r => !isClosed(r.status) && r.fechaFin).filter(r => {
            const fFin = parseDate(r.fechaFin);
            return isPastDate(fFin, today);
        }).map(r => {
            return {
                id: r.id,
                message: `${r.id}: ${r.title} debió terminar el ${r.fechaFin}.`,
                requestId: r.id
            };
        });

        if (atrasadasItems.length > 0) {
            newAlerts.push({
                id: 'atrasadas',
                title: 'Iniciativas Atrasadas',
                type: 'danger',
                icon: <AlertCircle size={16} className="text-red-600" />,
                items: atrasadasItems
            });
        }

        setAlerts(newAlerts);
    }, [requests]);

    const totalNotifications = alerts.reduce((acc, alert) => acc + alert.items.length, 0);

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
                <Bell size={20} />
                {totalNotifications > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
                        {totalNotifications > 99 ? '99+' : totalNotifications}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[85vh]">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
                        <h3 className="font-bold text-slate-800 text-sm">Notificaciones</h3>
                        <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {totalNotifications}
                        </span>
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {alerts.length === 0 ? (
                            <div className="p-6 text-center text-slate-500">
                                <Bell size={24} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-sm">Todo está al día.</p>
                                <p className="text-xs text-slate-400 mt-1">No hay alertas pendientes.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {alerts.map(group => (
                                    <div key={group.id} className="p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            {group.icon}
                                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                                {group.title} ({group.items.length})
                                            </h4>
                                        </div>
                                        <ul className="space-y-1.5">
                                            {group.items.map(item => (
                                                <li key={item.id}>
                                                    {item.requestId ? (
                                                        <button
                                                            onClick={() => {
                                                                setIsOpen(false);
                                                                onNotificationClick(item.requestId!);
                                                            }}
                                                            className="w-full text-left p-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all flex items-start gap-2 group"
                                                        >
                                                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${group.type === 'danger' ? 'bg-red-500' : group.type === 'warning' ? 'bg-orange-400' : 'bg-blue-500'}`} />
                                                            <span className="group-hover:text-blue-600 transition-colors leading-tight">
                                                                {item.message}
                                                            </span>
                                                        </button>
                                                    ) : (
                                                        <div className="w-full text-left p-2 rounded-lg text-sm text-slate-600 flex items-start gap-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${group.type === 'danger' ? 'bg-red-500' : group.type === 'warning' ? 'bg-orange-400' : 'bg-blue-500'}`} />
                                                            <span className="leading-tight">{item.message}</span>
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
