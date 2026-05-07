import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/cliente';
import type { Tarea, TareaColumna, TareaLog } from '../lib/supabase/tipos-bd';
import { useAuth } from './useAuth';
import * as XLSX from 'xlsx';

const sortTareas = (tareas: Tarea[]) => {
    const pesos = { 'Rojo': 1, 'Amarillo': 2, 'Verde': 3 } as Record<string, number>;
    return [...tareas].sort((a, b) => {
        const wA = pesos[a.urgencia] || 4;
        const wB = pesos[b.urgencia] || 4;
        if (wA !== wB) return wA - wB;
        return a.orden - b.orden;
    });
};

export function useTareas() {
    const { user } = useAuth();
    const [tareas, setTareas] = useState<Tarea[]>([]);
    const [columnas, setColumnas] = useState<TareaColumna[]>([]);
    const [cargando, setCargando] = useState(true);

    const cargarDatos = async (silencioso = false) => {
        try {
            if (!silencioso) setCargando(true);
            let tareasQuery = supabase.from('tareas').select('*').order('orden', { ascending: true });
            let colsQuery = supabase.from('tareas_columnas').select('*').order('orden', { ascending: true });

            const [colsResponse, tareasResponse] = await Promise.all([
                colsQuery,
                tareasQuery
            ]);

            if (colsResponse.error) throw colsResponse.error;
            if (tareasResponse.error) throw tareasResponse.error;

            setColumnas(colsResponse.data || []);
            setTareas(sortTareas(tareasResponse.data || []));
        } catch (error) {
            console.error('Error al cargar tareas:', error);
        } finally {
            if (!silencioso) setCargando(false);
        }
    };

    useEffect(() => {
        if (!user) return;
        cargarDatos();
        
        const subscriptionTareas = supabase
            .channel('tareas_cambios')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas' }, () => {
                cargarDatos(true); // Carga silenciosa para actualizaciones externas
            })
            .subscribe();

        const subscriptionColumnas = supabase
            .channel('columnas_cambios')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas_columnas' }, () => {
                cargarDatos(true); // Carga silenciosa para actualizaciones externas
            })
            .subscribe();

        return () => {
            subscriptionTareas.unsubscribe();
            subscriptionColumnas.unsubscribe();
        };
    }, [user]);

    const crearColumna = async (nombre: string) => {
        const orden = columnas.length;
        
        // Optimistic UI
        const tempId = `temp-${Date.now()}`;
        const nuevaColumna = { id: tempId, nombre, orden, creado_por: user?.id || null, fecha_creacion: new Date().toISOString() };
        setColumnas(prev => [...prev, nuevaColumna]);

        const { data, error } = await supabase
            .from('tareas_columnas')
            .insert([{ nombre, orden, creado_por: user?.id || null }])
            .select()
            .single();

        if (error) {
            setColumnas(prev => prev.filter(c => c.id !== tempId));
            throw error;
        }
        
        setColumnas(prev => prev.map(c => c.id === tempId ? data : c));
        return data;
    };

    const actualizarColumna = async (id: string, nombre: string) => {
        setColumnas(prev => prev.map(c => c.id === id ? { ...c, nombre } : c));
        const { error } = await supabase
            .from('tareas_columnas')
            .update({ nombre })
            .eq('id', id);

        if (error) {
            cargarDatos(); // revert on error
            throw error;
        }
    };

    const eliminarColumna = async (id: string) => {
        // Actualización optimista: removemos de la UI inmediatamente
        setColumnas(prev => prev.filter(c => c.id !== id));
        // También removemos las tareas de esa columna para mantener consistencia visual
        setTareas(prev => prev.filter(t => t.columna_id !== id));

        const { error } = await supabase
            .from('tareas_columnas')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error al eliminar columna:', error);
            cargarDatos(); // Revertir en caso de error
            throw error;
        }
    };

    const reordenarColumnas = async (ordenes: { id: string; orden: number }[]) => {
        // Ejecución en paralelo de los updates
        const promesas = ordenes.map(col =>
            supabase
                .from('tareas_columnas')
                .update({ orden: col.orden })
                .eq('id', col.id)
        );
        const resultados = await Promise.all(promesas);
        const errores = resultados.filter(r => r.error);
        if (errores.length > 0) {
            console.error('Error reordenando verticales', errores);
            cargarDatos();
        }
    };

    const crearTarea = async (titulo: string, descripcion: string | null, columna_id: string, urgencia: 'Verde'|'Amarillo'|'Rojo' = 'Verde', responsable_id?: string | null) => {
        const tareasColumna = tareas.filter(t => t.columna_id === columna_id && t.estado === 'Activa');
        const orden = tareasColumna.length;

        const finalResponsableId = responsable_id !== undefined ? responsable_id : (user?.id || null);

        const tempId = `temp-t-${Date.now()}`;
        const nuevaTarea: Tarea = {
            id: tempId,
            titulo,
            descripcion,
            columna_id,
            estado: 'Activa',
            urgencia,
            origen: 'manual',
            orden,
            creado_por: user?.id || null,
            responsable_id: finalResponsableId,
            fecha_asignacion: new Date().toISOString(),
            fecha_creacion: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString(),
        };
        
        setTareas(prev => sortTareas([...prev, nuevaTarea]));

        const { data, error } = await supabase
            .from('tareas')
            .insert([{
                titulo,
                descripcion,
                columna_id,
                estado: 'Activa',
                urgencia,
                origen: 'manual',
                orden,
                creado_por: user?.id,
                responsable_id: finalResponsableId,
                fecha_asignacion: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            setTareas(prev => prev.filter(t => t.id !== tempId));
            throw error;
        }
        
        setTareas(prev => sortTareas(prev.map(t => t.id === tempId ? data : t)));
        return data;
    };

    const duplicarTarea = async (tareaOriginal: Tarea) => {
        const tituloCopia = `${tareaOriginal.titulo} (Copia)`;
        await crearTarea(tituloCopia, tareaOriginal.descripcion, tareaOriginal.columna_id, tareaOriginal.urgencia);
    };

    const actualizarTarea = async (id: string, datos: Partial<Tarea>) => {
        setTareas(prev => sortTareas(prev.map(t => t.id === id ? { ...t, ...datos } : t)));
        const { error } = await supabase
            .from('tareas')
            .update(datos)
            .eq('id', id);

        if (error) {
            cargarDatos();
            throw error;
        }

        // Si cambió el responsable, registrar en el log
        if (datos.responsable_id) {
            const tareaOriginal = tareas.find(t => t.id === id);
            if (tareaOriginal && tareaOriginal.responsable_id !== datos.responsable_id) {
                await supabase.from('tareas_logs').insert([{
                    tarea_id: id,
                    cambiado_por: user?.id,
                    anterior_responsable_id: tareaOriginal.responsable_id,
                    nuevo_responsable_id: datos.responsable_id
                }]);
            }
        }
    };

    const eliminarTarea = async (id: string) => {
        // Actualización optimista: removemos de la UI inmediatamente
        setTareas(prev => sortTareas(prev.filter(t => t.id !== id)));
        
        const { error } = await supabase
            .from('tareas')
            .delete()
            .eq('id', id);

        if (error) {
            cargarDatos(); // Revertir si hay error
            throw error;
        }
    };

    const moverTarea = async (
        tareaId: string,
        nuevaColumnaId: string | null,
        nuevoOrden: number,
        tareasActualizadasOpt: Tarea[]
    ) => {
        // Actualizamos UI optimistamente (aplicando ordenrición estricta)
        setTareas(sortTareas(tareasActualizadasOpt));

        try {
            // Actualizar la tarea arrastrada
             await supabase
                .from('tareas')
                .update({ columna_id: nuevaColumnaId, orden: nuevoOrden })
                .eq('id', tareaId);
                
            // Como las otras tareas cambiaron su orden (se desplazaron) 
            // supabase no soporta updateBatch nativo facilmente, pero dado que usamos
            // subscripciones Realtime, los cambios se reflejarán si los hacemos.
            // Una optimización simple: actualizar todas las interesadas de la nueva y vieja columna.
            
            const afectadas = tareasActualizadasOpt.filter(t => 
                (t.columna_id === nuevaColumnaId) || 
                (nuevaColumnaId !== null && t.columna_id === nuevaColumnaId)
            );

            // Actualizamos en paralelo las ordenadas (solo aquellas que hayan cambiado orden no está cacheado, asique subimos todas las de esta clumna)
            const promesas = afectadas.map(t => 
                supabase.from('tareas').update({ orden: t.orden }).eq('id', t.id)
            );
            
            await Promise.all(promesas);
        } catch (error) {
            console.error('Error al mover tarea:', error);
            cargarDatos(); // Revert
            throw error;
        }
    };

    const obtenerLogsTarea = async (tareaId: string): Promise<TareaLog[]> => {
        const { data, error } = await supabase
            .from('tareas_logs')
            .select('*')
            .eq('tarea_id', tareaId)
            .order('fecha', { ascending: false });
        
        if (error) throw error;
        return data || [];
    };

    const exportarAExcel = (columnasActuales: TareaColumna[], tareasActuales: Tarea[], usuarios: any[]) => {
        const data = tareasActuales.map(t => {
            const col = columnasActuales.find(c => c.id === t.columna_id);
            const resp = usuarios.find(u => u.id === t.responsable_id);
            const creator = usuarios.find(u => u.id === t.creado_por);
            
            return {
                'Título': t.titulo,
                'Descripción': t.descripcion,
                'Columna': col?.nombre || 'Sin columna',
                'Urgencia': t.urgencia,
                'Estado': t.estado,
                'Responsable': resp?.nombre_completo || t.responsable_id,
                'Creado Por': creator?.nombre_completo || t.creado_por,
                'Fecha Registro': new Date(t.fecha_creacion).toLocaleString(),
                'Fecha Asignación': t.fecha_asignacion ? new Date(t.fecha_asignacion).toLocaleString() : 'N/A',
                'Última Actualización': new Date(t.fecha_actualizacion).toLocaleString()
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tareas Kanban");
        XLSX.writeFile(wb, `Kanban_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return {
        tareas,
        columnas,
        cargando,
        crearColumna,
        actualizarColumna,
        eliminarColumna,
        reordenarColumnas,
        crearTarea,
        actualizarTarea,
        eliminarTarea,
        moverTarea,
        duplicarTarea,
        obtenerLogsTarea,
        exportarAExcel,
        recargar: cargarDatos,
    };
}
