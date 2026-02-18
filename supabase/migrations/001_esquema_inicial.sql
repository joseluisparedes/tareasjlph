-- Tabla de usuarios
CREATE TABLE usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo text NOT NULL,
  correo_electronico text NOT NULL UNIQUE,
  rol text NOT NULL CHECK (rol IN ('Admin', 'Editor', 'Lector')),
  url_avatar text,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_actualizacion timestamptz DEFAULT now()
);

-- Tabla de dominios
CREATE TABLE dominios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  esta_activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_actualizacion timestamptz DEFAULT now()
);

-- Tabla de solicitudes
CREATE TABLE solicitudes (
  id text PRIMARY KEY,
  titulo text NOT NULL,
  descripcion text NOT NULL,
  tipo_solicitud text NOT NULL CHECK (tipo_solicitud IN ('BAU', 'No BAU', 'Incidente', 'Nuevo Pedido', 'Ad Hoc')),
  dominio_id uuid NOT NULL REFERENCES dominios(id),
  solicitante text NOT NULL,
  prioridad text NOT NULL CHECK (prioridad IN ('Crítica', 'Alta', 'Media', 'Baja')),
  estado text NOT NULL CHECK (estado IN ('Pendiente', 'Análisis', 'Desarrollo', 'Pruebas', 'Cerrado')),
  asignado_a uuid REFERENCES usuarios(id),
  fecha_vencimiento timestamptz,
  id_externo text,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_actualizacion timestamptz DEFAULT now(),
  creado_por uuid NOT NULL REFERENCES usuarios(id)
);

-- Índices para optimización
CREATE INDEX idx_solicitudes_estado ON solicitudes(estado);
CREATE INDEX idx_solicitudes_dominio ON solicitudes(dominio_id);
CREATE INDEX idx_solicitudes_asignado ON solicitudes(asignado_a);
CREATE INDEX idx_solicitudes_creacion ON solicitudes(fecha_creacion DESC);

-- Función para actualizar fecha_actualizacion automáticamente
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar fecha_actualizacion
CREATE TRIGGER trigger_actualizar_usuarios
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TRIGGER trigger_actualizar_dominios
  BEFORE UPDATE ON dominios
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TRIGGER trigger_actualizar_solicitudes
  BEFORE UPDATE ON solicitudes
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_fecha_modificacion();

-- Función para generar ID de solicitud
CREATE OR REPLACE FUNCTION generar_id_solicitud()
RETURNS text AS $$
DECLARE
  anio text;
  contador int;
  nuevo_id text;
BEGIN
  anio := to_char(now(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 10) AS int)), 0) + 1
  INTO contador
  FROM solicitudes
  WHERE id LIKE 'BRM-' || anio || '-%';
  
  nuevo_id := 'BRM-' || anio || '-' || LPAD(contador::text, 4, '0');
  RETURN nuevo_id;
END;
$$ LANGUAGE plpgsql;
