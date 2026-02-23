-- Migración para crear la tabla de configuración pública

CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Insertar valor por defecto: Permitir registro
INSERT INTO public.app_settings (id, value) 
VALUES ('allow_registration', 'true'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Política de lectura: Cualquiera puede leer (anon y authenticated)
CREATE POLICY "Lectura pública de configuraciones"
ON public.app_settings
FOR SELECT
USING (true);

-- Política de modificación: Sólo el administrador puede modificar
CREATE POLICY "Modificación sólo admin"
ON public.app_settings
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM usuarios
        WHERE id = auth.uid() AND rol = 'Administrador'
    )
);

-- Trigger para updated_at (asumiendo que function update_updated_at_column existe)
CREATE OR REPLACE FUNCTION update_app_settings_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_app_settings_modtime ON public.app_settings;
CREATE TRIGGER trg_app_settings_modtime
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE PROCEDURE update_app_settings_modtime();
