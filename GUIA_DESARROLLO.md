# Guía de desarrollo — Backend Café Mocca

**Para:** Herber (backend completo, tú solo)
**Empresa:** Café Mocca — Pastelería y Bistro · Usulután, El Salvador
**Actualizada:** 19 de octubre de 2026
**Se lee junto con:** `cafe_mocca_schema.sql` (el esquema) y `plan_modificaciones_cafe_mocca.md` (el porqué de cada cambio, según el profe)

---

## 0. Dónde estás parado

**Lo que ya funciona** (probado): registro, login con JWT, roles, límite de intentos de login y CRUD de categorías.

**Lo nuevo:**
- `cafe_mocca_schema.sql` crea las **20 tablas** del esquema v2 con todas sus restricciones, 17 índices, 3 triggers, comentarios y los datos de referencia (unidades, métodos de pago, horario real, empresa, configuración). Lo probé contra PostgreSQL 16 con unas 50 comprobaciones (restricciones, triggers, permisos del rol de la app) y comprobé que la API que ya tienes corre encima sin cambios, salvo lo que se explica en la sección 4.
- Todo el backend es tuyo. **Jaime y Rodrigo se reparten el frontend**, así que son tus "clientes": necesitan endpoints reales pronto (sección 7).

**Tu fecha:** 22 días desde hoy (lunes 19 de octubre) = **martes 10 de noviembre**. De esos días, 17 son hábiles; los fines de semana son colchón, no plan. El backend completo son unos 13 días de trabajo enfocado, así que **sí alcanza**, con margen.

> Ojo: el 2 de noviembre es feriado en El Salvador (Día de los Difuntos). Si lo descansas, ese día se come del colchón.

---

## 1. Paso 1 — PostgreSQL, base de datos y API conectada (hoy, 2–3 horas)

### 1.1 Instala PostgreSQL 15 o 16
- **Windows / Mac:** instalador oficial de postgresql.org (incluye `psql` y pgAdmin). Anota la contraseña que le pongas al usuario `postgres`.
- **Linux:** `sudo apt install postgresql`
- **Con Docker:** `docker run --name cafe-mocca-db -e POSTGRES_PASSWORD=clave_admin -p 5432:5432 -d postgres:16`

### 1.2 Crea el rol de la aplicación y la base
En una terminal (en Windows, "SQL Shell (psql)"):

```bash
psql -U postgres -h localhost
```

Dentro de `psql`:

```sql
CREATE ROLE cafe_mocca_app LOGIN PASSWORD 'una_clave_larga_y_unica';
CREATE DATABASE cafe_mocca WITH ENCODING 'UTF8';
\q
```

- Usa una contraseña **solo con letras y números**. Los símbolos como `@` o `/` rompen la URL de conexión si no se codifican.
- Esa contraseña no se escribe en ningún archivo que subas a GitHub. Solo va en tu `.env`.
- Si prefieres pgAdmin: crea el rol y la base desde el menú, y ejecuta `CREATE DATABASE` **sola** en el Query Tool (no puede ir junto con otras sentencias).

### 1.3 Ejecuta el script sobre la base vacía

```bash
psql -U postgres -h localhost -d cafe_mocca -v ON_ERROR_STOP=1 -f cafe_mocca_schema.sql
```

(En pgAdmin: Query Tool sobre `cafe_mocca` → abrir archivo → ejecutar.)

Todo el script va dentro de una transacción: si algo falla, **no queda nada a medias**. Corriges y vuelves a ejecutar. Al final debe decir `Permisos otorgados a cafe_mocca_app`. Si dice que el rol no existe, créalo (paso 1.2) y reinicia (ver 1.8).

### 1.4 Comprueba que quedó bien

| Comando | Debe dar |
|---|---|
| `\dt` | 20 tablas |
| `SELECT count(*) FROM unidades_medida;` | 8 |
| `SELECT count(*) FROM metodos_pago;` | 3 (Efectivo, Transferencia, Tarjeta) |
| `SELECT count(*) FROM horarios_atencion;` | 7 |
| `SELECT nombre_comercial, ciudad FROM empresa;` | Café Mocca · Usulután |
| `\di` | La lista de índices (los `ix_` y `ux_`) |

### 1.5 Conecta tu proyecto

En tu `.env` (y en `.env.example`, sin la clave real):

```
DATABASE_URL=postgresql+psycopg2://cafe_mocca_app:TU_CLAVE@localhost:5432/cafe_mocca
```

**Importante:** el prefijo debe ser `postgresql+psycopg2://`, no solo `postgresql://`. Con el SQLAlchemy actual (2.1), sin el `+psycopg2` busca otro driver y falla con `No module named 'psycopg'`. (Me pasó probándolo; el comentario del `.env.example` que viene en el zip viejo tiene el prefijo sin el `+psycopg2`, corrígelo.)

Después, en `app/main.py`, **elimina** la línea `Base.metadata.create_all(bind=engine)`. El esquema ya lo creó el script; si la dejas, SQLAlchemy intentaría crear tablas con la definición vieja.

### 1.6 Crea tu usuario administrador
El registro público solo crea clientes, así que:
1. Arranca la API (`uvicorn app.main:app --reload`) y regístrate desde `/docs` con **tu correo en minúsculas**.
2. Promuévete desde `psql`:

```sql
UPDATE usuarios SET rol = 'admin' WHERE email = 'tu_correo@ejemplo.com';
```

3. Vuelve a hacer login (el rol viaja dentro del token; el token viejo sigue diciendo "cliente").

### 1.7 Errores comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `No module named 'psycopg'` | Falta el `+psycopg2` en la URL | Ver 1.5 |
| `password authentication failed for user "cafe_mocca_app"` | Clave mal escrita o con símbolos sin codificar | Cambia la clave por una alfanumérica: `ALTER ROLE cafe_mocca_app PASSWORD 'nueva';` |
| `connection refused` | El servicio de PostgreSQL está apagado o es otro puerto | Inícialo; el puerto por defecto es 5432 |
| `permission denied for table ...` | Ejecutaste el script antes de crear el rol | Crea el rol y ejecuta de nuevo solo la sección 13 del script (el bloque `DO`) |
| `relation "usuarios" does not exist` | Te conectaste a otra base (por ejemplo `postgres`) | Conéctate a `cafe_mocca` |
| `ck_usuarios_email_minusculas` en el log y un 500 en el registro | La API no normaliza el correo | Ver 4.1 |
| El script dice que algo "ya existe" | La base no estaba vacía | Reinicio total (1.8) |

### 1.8 Limpiar y reiniciar mientras desarrollas

- **Borrar los datos pero conservar la estructura** (conserva `unidades_medida`, `metodos_pago`, `horarios_atencion`, `empresa` y `configuracion`, porque no se incluyen):

```sql
TRUNCATE usuarios, categorias RESTART IDENTITY CASCADE;
```

  El `CASCADE` arrastra todas las tablas que dependen de esas dos (productos, pedidos, insumos con movimientos, etc.). Los ids vuelven a empezar en 1.
- **Reinicio total:** descomenta las dos líneas `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` al inicio del script, ejecútalo completo, y vuelve a comentarlas. Recuerda crear antes el rol si todavía no existe.

---

## 2. Qué cambia en el proyecto

### 2.1 La decisión de fondo
**El script SQL es la fuente de verdad del esquema. `models.py` solo mapea tablas que ya existen.**

Consecuencias:
- Las restricciones (`CHECK`, `UNIQUE`, `FK`) **viven en la base**. No hace falta repetirlas en `models.py`.
- La API valida antes con Pydantic para dar mensajes claros; la base es la última barrera.
- Para cambiar el esquema: editas el `.sql`, reinicias, y ajustas el modelo. Nunca al revés.

### 2.2 Cambios en lo que ya tienes

| Qué | Cambio |
|---|---|
| `main.py` | Quitar `create_all`. Título: `"Café Mocca API"` |
| `.env` / `.env.example` | URL con `postgresql+psycopg2://` |
| Nombres | Carpeta `cafe-mocca-api`, y buscar `Panadería IA`, `panaderia`, `Reposteria_web` en todo el proyecto |
| `models.py` | Reescribirlo para mapear las 20 tablas (día 2 y 3 del calendario) |
| `requirements.txt` | Ya trae `psycopg2-binary` y `bcrypt<4.0.0`; no cambia |

### 2.3 Estructura sugerida

```
cafe-mocca-api/
├── sql/
│   └── cafe_mocca_schema.sql
├── app/
│   ├── main.py  config.py  database.py  security.py  dependencies.py
│   ├── models.py          # mapea las 20 tablas (no crea nada)
│   ├── schemas.py         # entradas y salidas de la API
│   ├── routers/
│   │   ├── auth.py  categorias.py          # ya los tienes
│   │   ├── publico.py                      # empresa, horarios, métodos de pago
│   │   ├── productos.py  opciones.py
│   │   ├── pedidos.py
│   │   ├── insumos.py  recetas.py  inventario.py
│   │   └── sugerencias.py
│   └── services/
│       ├── pedidos.py      # recalcular precios, crear pedido, estados
│       ├── inventario.py   # movimientos, costo promedio, consumo
│       ├── costos.py       # costo de receta y margen
│       ├── unidades.py     # conversión de unidades
│       └── ia.py           # sugerencias
├── tests/
├── .env.example  requirements.txt  README.md  GUIA_DESARROLLO.md
```

**Regla de oro:** los *routers* son delgados (reciben, validan permisos, llaman, responden). La lógica con cuentas (precios, costos, stock) va en `services/`. Así la puedes probar sin levantar la API.

### 2.4 Del SQL a SQLAlchemy: equivalencias que vas a necesitar

| En el script | En `models.py` |
|---|---|
| `integer GENERATED ALWAYS AS IDENTITY` | `Column(Integer, primary_key=True)` (la base genera el id; no lo mandes) |
| `bigint ... IDENTITY` (kárdex) | `Column(BigInteger, primary_key=True)` |
| `numeric(10,2)` | `Numeric(10, 2)` (llega a Python como `Decimal`) |
| `timestamptz` | `DateTime(timezone=True)`, con `server_default=func.now()` |
| `varchar(n)` + `CHECK (... IN (...))` | `String(n)` (o `Enum` con `native_enum=False`; guarda el *nombre* del miembro, que debe ser igual al texto de la base) |
| `GENERATED ALWAYS AS (...) STORED` (`subtotal_linea`) | `Computed("...", persisted=True)`; es de solo lectura |
| PK compartida (`inventario_producto`, `personalizacion`) | `Column(Integer, ForeignKey(..., ondelete="CASCADE"), primary_key=True)` |
| PK compuesta (`receta_insumos`, `personalizacion_opciones`) | `primary_key=True` en las dos columnas |
| Índices parciales y `UNIQUE` | No se declaran en el modelo: ya existen en la base |

---

## 3. Seguridad

| Medida | Dónde | Por qué importa |
|---|---|---|
| Contraseñas con hash (bcrypt) | `security.py` | Si roban la base, no obtienen contraseñas legibles |
| JWT con expiración | `security.py`, `.env` | La sesión no dura para siempre |
| Rutas por rol | `dependencies.py` | Un cliente no ejecuta acciones de administrador aunque adivine la URL |
| Límite de intentos de login | `routers/auth.py` | Dificulta adivinar contraseñas. **Extiéndelo** a registro y a `POST /pedidos` |
| **Rol de BD con mínimo privilegio** | Sección 13 del script | La app usa `cafe_mocca_app`: no crea ni borra tablas, y sobre el kárdex solo puede leer e insertar |
| **Restricciones en la base** | Todo el esquema | Aunque la API tenga un error, la base rechaza totales que no cuadran, stock negativo, etc. |
| **Kárdex inmutable** | Trigger + permisos | Nadie edita ni borra un movimiento de inventario: el historial no se puede maquillar |
| **Precios recalculados en el servidor** | `services/pedidos.py` | Nunca confiar en un precio que llegue del navegador |
| **El cliente solo ve lo suyo** | `routers/pedidos.py` | Comparar `pedido.usuario_id` con el usuario del token. Para pedido ajeno, responder 404 |
| Correos normalizados | Registro y login | Evita cuentas duplicadas por mayúsculas (la base lo exige) |
| **Errores de BD nunca salen al cliente** | Manejador global (4.2) | Un mensaje crudo de PostgreSQL revela nombres de tablas y columnas |
| Secretos fuera del código | `.env` + `.gitignore` | La clave y la conexión nunca llegan a GitHub |
| Sin datos de tarjeta | Todo el sistema | "Tarjeta" es cobro con POS al entregar; el sistema nunca los toca |
| CORS con lista explícita | `main.py` | Si Jaime o Rodrigo usan un puerto distinto de 5500, agrégalo a `CORS_ORIGINS` |
| No registrar secretos | Logs | Nunca imprimas contraseñas ni tokens |

---

## 4. Ajustes a lo que ya tienes

### 4.1 Correo en minúsculas
La base rechaza correos con mayúsculas (`ck_usuarios_email_minusculas`). Hoy la API devuelve un 500 en ese caso (lo comprobé). Tu tarea:
1. En el **registro**, antes de buscar o guardar: quita espacios y pasa a minúsculas.
2. En el **login**, haz lo mismo con `form_data.username` antes de la búsqueda.
3. Agrega `telefono` (opcional) al esquema de registro; la columna ya existe.

### 4.2 Traducir los errores de la base
Hoy cualquier violación de restricción termina en un 500. Lo correcto:
1. Un **manejador global** en `main.py` para `IntegrityError` de SQLAlchemy.
2. Lee el nombre de la restricción con `exc.orig.diag.constraint_name` (psycopg2).
3. Tradúcelo con un diccionario pequeño: `uq_usuarios_email` → "Ese correo ya está registrado", `uq_categorias_nombre` → "Esa categoría ya existe", `ck_pedidos_total` → "Los montos del pedido no cuadran", etc.
4. Responde **409** (o 400) con ese mensaje. El error completo se registra en el log del servidor, nunca en la respuesta.

### 4.3 Una consecuencia en categorías
Borrar una categoría que tiene productos ahora falla (`fk_productos_categoria` es `RESTRICT`). En SQLite esto pasaba desapercibido. Responde 409 con un mensaje claro ("Hay productos en esta categoría").

---

## 5. Conceptos que vas a necesitar

Las partes difíciles, explicadas como pasos para que las escribas tú. Los números de ejemplo son ilustrativos.

### 5.1 Dinero
- Usa `Decimal`, **nunca `float`**. Redondea a 2 decimales con `quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)`. Los costos de insumos llevan 4 decimales.
- Pydantic v2 entrega los `Decimal` como **texto** (`"27.99"`). Jaime ya sabe; no lo "arregles" convirtiendo a `float`.

### 5.2 Transacciones
- **Una petición = una transacción.** Para crear un pedido (pedido + líneas + personalización + opciones + stock) todo se guarda o nada se guarda.
- Un solo `db.commit()` al final. Si algo falla, `rollback`.

### 5.3 Crear un pedido: recalcular todo en el servidor
Para cada línea que llega (`producto_id`, `cantidad`, `opciones`):
1. Carga el producto; debe existir y estar `activo`.
2. Si trae opciones: el producto debe ser `es_personalizable`; cada opción debe existir, estar `activa` y ser del producto o global; **solo una por `tipo_opcion`**.
3. `precio_aplicado` = `precio_base` del producto. `recargo_personalizacion` = suma de recargos de las opciones.
4. `subtotal` += `cantidad × (precio_aplicado + recargo)`.
5. Si el producto es de disponibilidad inmediata y tiene fila en `inventario_producto`: bloquea la fila, descuenta la cantidad y responde **409** si no alcanza.

Luego, a nivel de pedido:
6. `costo_envio` = valor de `configuracion` si es domicilio; `0` si es retiro.
7. `total = subtotal + costo_envio`.
8. Valida la fecha programada: si hay productos "bajo pedido", `fecha_entrega_programada` ≥ ahora + la mayor `horas_anticipacion` de las líneas.
9. **Ignora cualquier precio o total que mande el cliente.** Ni siquiera lo aceptes en el esquema de entrada.

### 5.4 Bloquear filas para no quedar en negativo
Cuando dos pedidos consumen el mismo insumo a la vez, hay que serializarlos:
- Consulta con `with_for_update()` (equivale a `SELECT ... FOR UPDATE`).
- **Bloquea siempre en el mismo orden** (por `id` ascendente) para evitar bloqueos mutuos entre pedidos.
- Si el stock no alcanza: `rollback` y **409** indicando qué insumo falta.

### 5.5 Conversión de unidades
- Cada unidad tiene `factor_a_base` (g, ml, unidad = 1).
- Solo se convierte entre unidades del **mismo `tipo`** (peso con peso).
- `cantidad_destino = cantidad × factor_origen ÷ factor_destino`. Ejemplo: 500 g → `500 × 1 ÷ 1000` = 0.5 kg.
- Escribe **una sola función** y úsala en todas partes.

### 5.6 Costo promedio ponderado
Al registrar una compra (`entrada_compra`):
- `costo_nuevo = (stock_previo × costo_previo + cantidad × costo_compra) ÷ (stock_previo + cantidad)`
- Ejemplo: 10 kg a $0.80 y compras 25 kg a $0.70 → `(8.00 + 17.50) ÷ 35` = **$0.7286/kg**.
- Si `stock_previo` es 0, el costo nuevo es simplemente el de la compra (cuidado con dividir entre cero).
- El movimiento, el cambio de `stock_actual` y el de `costo_promedio` van en la **misma transacción**. `stock_actual` solo cambia por movimientos.

### 5.7 Consumo de insumos y estados del pedido

Transiciones válidas (cualquier otra es un 409):

```
recibido → en_preparacion → listo → entregado
recibido → cancelado
```

- Cancelar **solo desde `recibido`** (simplificación: después de preparar, se registra merma). Al cancelar, devuelve el stock de `inventario_producto`.
- Al pasar a `en_preparacion`, por cada línea con receta activa, por cada insumo de la receta: `consumo = cantidad_receta (convertida a la unidad del insumo) × cantidad_línea ÷ rinde_cantidad`. Crea un movimiento `salida_consumo` con el `pedido_id` y descuenta el stock (con bloqueo, 5.4).
- Simplificación aceptada: aunque un croissant se hornee por lotes, el consumo se atribuye al pedido. Está bien para el alcance del proyecto; anótalo en el documento.
- Al pasar a `entregado`, actualiza `historial_ventas`: una fila por producto por día (`INSERT ... ON CONFLICT (producto_id, fecha) DO UPDATE`), sumando la cantidad y recalculando el precio promedio ponderado.

### 5.8 Costo y margen de un producto
- `costo_unitario = Σ(consumo_en_unidad_del_insumo × costo_promedio) ÷ rinde_cantidad`
- `margen = precio_base − costo_unitario`; en porcentaje: `margen ÷ precio_base`.
- Guarda `costo_unitario_estimado` en cada línea de pedido al venderla, para tener margen histórico aunque los costos cambien después.

### 5.9 Fechas
- La base guarda `timestamptz` (UTC). En Python usa `datetime.now(timezone.utc)`. Nunca `datetime.utcnow()` ni fechas sin zona.
- El frontend convierte a hora de El Salvador (UTC−6, sin horario de verano).

### 5.10 La IA en su versión simple
Para cada producto con al menos 14 días de historial:
1. Demanda esperada de mañana = promedio de ventas de los últimos 4 mismos días de la semana (si no hay, promedio de 14 días).
2. Índice de demanda = esperada ÷ promedio general.
3. `cantidad_sugerida` = esperada × 1.10, menos lo que ya hay listo en `inventario_producto`.
4. Precio: índice ≥ 1.2 → +5 %; índice ≤ 0.8 → −5 %; si no, sin cambio. Tope de ±10 % sobre `precio_base`.
5. **Piso:** nunca por debajo de `costo × (1 + margen_minimo_pct ÷ 100)`. La base además rechaza una sugerencia bajo el costo.
6. Guarda en `sugerencias_ia` con `costo_unitario_ref` y estado `pendiente`.

Los umbrales (1.2, 0.8, 5 %, 10 %) son de ejemplo; ajústalos cuando veas los datos. Si sobra tiempo, `scikit-learn` viene después, no antes.

---

## 6. Hoja de ruta (22 días)

Cada día lleva una meta que puedas **verificar** y un commit al final. Sesiones de 45 a 60 minutos con descanso entre una y otra; al terminar el día, anota cuál es el siguiente paso. Si empiezas un día después, todo se corre un día y se come del colchón.

### Semana 1 — Cimientos y lecturas para el frontend (19–23 oct)

| Fecha | Meta | Hecho cuando |
|---|---|---|
| Lun 19 | Paso 1 completo (secciones 1.1 a 1.6) | `/docs` abre contra PostgreSQL, `\dt` da 20 tablas, entras con tu usuario admin |
| Mar 20 | `models.py` (1.ª mitad): usuarios, categorías, productos, inventario_producto, opciones, empresa, horarios, métodos de pago, configuración, unidades. Quitar `create_all`. Renombrar a Café Mocca | La API arranca y puedes leer esas tablas desde el ORM |
| Mié 21 | `models.py` (2.ª mitad): insumos, recetas, receta_insumos, movimientos, pedidos, detalle_pedido, personalización, opciones elegidas, historial, sugerencias. Ajustes 4.1, 4.2 y 4.3 | Registrar con mayúsculas ya no da 500; el error de duplicado sale como 409 |
| Jue 22 | Lecturas públicas: `/empresa`, `/horarios`, `/metodos-pago`, `/productos`, `/productos/{id}`, `/productos/{id}/opciones` | Se ven en `/docs` con montos como texto |
| Vie 23 | CRUD admin de productos, `inventario_producto` y opciones. Cargar la **carta real** | **Hito 1** — avisas a Jaime y Rodrigo: ya hay productos reales |

### Semana 2 — Pedidos e insumos (26–30 oct)

| Fecha | Meta | Hecho cuando |
|---|---|---|
| Lun 26 | `POST /pedidos` (5.3, pasos 1 a 7) | Un pedido simple se crea y los montos los calcula el servidor |
| Mar 27 | Personalización, fecha de anticipación y contacto (5.3, pasos 8 y 9) | Una torta con relleno extra se crea con su recargo correcto |
| Mié 28 | Mis pedidos, detalle, lista de admin con filtros, cambio de estado con las transiciones de 5.7 (sin consumo todavía) | **Hito 2** — el checkout real funciona; un cliente no ve pedidos ajenos |
| Jue 29 | Insumos (CRUD), compra con costo promedio (5.6) y kárdex de lectura | Comprar harina sube el stock y recalcula el costo |
| Vie 30 | Merma, ajustes y `GET /inventario/alertas` | **Hito 3** — la pantalla de inventario ya puede ser real |

### Semana 3 — Recetas, costos, IA y evidencia (2–6 nov)

| Fecha | Meta | Hecho cuando |
|---|---|---|
| Lun 2 | Recetas (`GET/PUT /productos/{id}/receta`) con validación de unidades y conversión | Una receta guarda y rechaza unidades de tipo distinto |
| Mar 3 | Costo y margen (`GET /productos/{id}/costo`) y `costo_unitario_estimado` al vender | El costo coincide con tu cuenta hecha a mano |
| Mié 4 | Consumo al pasar a `en_preparacion` (con bloqueo y 409) e `historial_ventas` al entregar | Un pedido descuenta insumos y el kárdex lo muestra |
| Jue 5 | IA v1 (5.10): servicio y endpoints para listar, aceptar y descartar | **Hito 4** — catálogo admin con receta y panel de IA reales |
| Vie 6 | **Evidencia para el profe:** datos masivos, `EXPLAIN ANALYZE` antes y después, ERD final, diccionario y matriz de trazabilidad | Documento completo (ver plan §5 y §8) |

### Colchón y cierre (9–10 nov)
Pruebas de punta a punta con el frontend, arreglos, ensayo de la demostración (comprar harina → hacer un pedido → ver el descuento y el costo) y documento final.

### Si te atrasas más de 3 días: qué recortar (en este orden)
1. La IA: solo promedio simple por día de la semana, sin precio sugerido.
2. El consumo automático: que sea un movimiento manual de consumo desde el admin.
3. La evidencia: `EXPLAIN` en 2 consultas en lugar de 3.
4. El generador de contenido para redes de la pantalla de IA: se quita del mockup.

**Lo que no se recorta:** la seguridad, las restricciones de la base, los pedidos con precios recalculados en el servidor, y los insumos con recetas y movimientos (es lo que pidió el profe).

---

## 7. Qué le entregas a Jaime y Rodrigo

**Convenciones** (ya las tienen en su guía):
- URL base `http://127.0.0.1:8000`; el contrato real es siempre `/docs`.
- Los campos van en `snake_case`, igual que las columnas.
- Los montos llegan como **texto**; las fechas, en UTC.
- Códigos: 401 sesión inválida · 403 no es admin · 409 conflicto (por ejemplo, falta stock) · 422 datos inválidos · 429 demasiados intentos.

| Hito | Endpoints que quedan listos |
|---|---|
| 1 · Vie 23 | `GET /empresa`, `/horarios`, `/metodos-pago`, `/categorias`, `/productos`, `/productos/{id}`, `/productos/{id}/opciones` · registro y login |
| 2 · Mié 28 | `POST /pedidos`, `GET /pedidos/mis`, `GET /pedidos/{id}` · admin: `GET /pedidos`, `PATCH /pedidos/{id}/estado` |
| 3 · Vie 30 | `GET/POST /insumos`, `POST /insumos/{id}/movimientos`, `GET /insumos/{id}/movimientos`, `GET /inventario/alertas`, `GET /unidades` |
| 4 · Jue 5 | `GET/PUT /productos/{id}/receta`, `GET /productos/{id}/costo`, `GET /sugerencias-ia` + aceptar/descartar |

Cuando publiques un hito, escríbeles un mensaje corto: qué endpoints, un ejemplo de respuesta y cualquier cambio de nombre. Es mejor que lo vean en `/docs` y no que lo adivinen.

---

## 8. Cómo comprobar tu trabajo

### 8.1 Que la base se defienda sola
Ejecuta estas sentencias en `psql` (cada una **debe fallar** con el mensaje indicado). Sirven también para mostrarle al profe que las restricciones existen:

| Sentencia | Debe decir |
|---|---|
| `INSERT INTO usuarios (nombre,email,password_hash) VALUES ('X','ABC@x.com','h');` | `ck_usuarios_email_minusculas` |
| `UPDATE insumos SET stock_actual = -1;` | `ck_insumos_stock` |
| `UPDATE movimientos_inventario SET cantidad = 1;` | "es de solo inserción" |
| Un pedido con `total` distinto de `subtotal + costo_envio` | `ck_pedidos_total` |
| Un pedido de retiro con `costo_envio` mayor que 0 | `ck_pedidos_retiro_sin_envio` |

### 8.2 Que las cuentas den bien
Las funciones de `services/` son matemática pura: pruébalas con `pytest` sin levantar la API. Tres casos con resultado conocido:
- Costo promedio: 10 kg a $0.80 + 25 kg a $0.70 → **$0.7286**.
- Conversión: 500 g → **0.5 kg**; 1 l → **1000 ml**; 1 kg → l da error (tipos distintos).
- Línea de pedido: 2 × (27.99 + 3.50) = **62.98**.

### 8.3 Antes de avisar a Jaime y Rodrigo
- [ ] Se ve bien en `/docs` y los ejemplos tienen sentido
- [ ] Probado con cliente, con admin y sin sesión (deben dar 200 / 200 / 401 o 403 según el endpoint)
- [ ] Ningún error de base llega como 500 con texto de PostgreSQL
- [ ] Commit hecho y sin `.env` en el repositorio

---

## 9. Diferencias entre el script y el plan

Se agregaron cosas al construir el script. **Ante cualquier diferencia, manda el script.**

| Tabla | Qué se agregó o cambió respecto a `plan_modificaciones_cafe_mocca.md` |
|---|---|
| `inventario_producto` | **PK compartida**: `producto_id` es PK y FK, sin `id` propio (mismo criterio que `personalizacion`). El plan decía `id` + UNIQUE |
| `usuarios` | Columna `telefono` y `CHECK (email = lower(email))` |
| `productos` | `UNIQUE (categoria_id, nombre)` y `creado_en` |
| `opciones_personalizacion` | La unicidad usa **dos índices únicos parciales** (global y por producto), porque un `UNIQUE` normal no ve los duplicados cuando `producto_id` es NULL |
| `pedidos` | Columna `notas`; CHECKs extra: retiro sin envío, fecha programada futura, nombre de contacto no vacío |
| `movimientos_inventario` | CHECK de nota obligatoria en merma y ajustes; `pedido_id` solo en consumo; **trigger de solo inserción** (el plan lo dejaba a la API) y rol sin `UPDATE`/`DELETE` |
| `sugerencias_ia` | CHECK de al menos una sugerencia y de precio sugerido no menor al costo de referencia |
| `historial_ventas` | El índice único del plan es la restricción `ux_historial_producto_fecha` |
| `insumos`, `inventario_producto` | Trigger que mantiene `actualizado_en` |
| Todas | `COMMENT ON TABLE` (el diccionario de datos queda dentro de la base) y rol `cafe_mocca_app` con mínimo privilegio |

Los 17 índices del plan están. Hay 3 índices únicos extra (los dos de opciones y el de productos por categoría y nombre).

---

## 10. Cuando te atores

- Pásame el **mensaje de error completo** y el **fragmento de código** donde ocurre, no una descripción.
- Dime también qué esperabas que pasara.
- Si es un tema de la sección 5, intenta primero escribir los pasos con tus palabras y yo te los reviso. Así lo entiendes y lo puedes defender frente al profe.
- Cuando termines un día de la hoja de ruta, mándame lo que hiciste y lo revisamos juntos antes de pasar al siguiente.
