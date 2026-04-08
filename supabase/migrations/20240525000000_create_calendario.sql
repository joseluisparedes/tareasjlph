-- Migration 20240525000000_create_calendario.sql
CREATE TABLE public.actividades_calendario (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    descripcion TEXT NOT NULL,
    tipo_actividad TEXT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    hora_inicio TIME,
    hora_fin TIME,
    creado_por UUID REFERENCES auth.users(id),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_fechas CHECK (fecha_fin >= fecha_inicio)
);

-- Trigger para fecha_actualizacion
CREATE TRIGGER set_timestamp_actividades_calendario
BEFORE UPDATE ON public.actividades_calendario
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Habilitar RLS
ALTER TABLE public.actividades_calendario ENABLE ROW LEVEL SECURITY;

-- Politicas para actividades_calendario
CREATE POLICY "Usuarios autenticados pueden ver actividades_calendario" ON public.actividades_calendario
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden crear actividades_calendario" ON public.actividades_calendario
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar las propias actividades" ON public.actividades_calendario
    FOR UPDATE USING (auth.uid() = creado_por);

CREATE POLICY "Usuarios autenticados pueden eliminar las propias actividades" ON public.actividades_calendario
    FOR DELETE USING (auth.uid() = creado_por);
