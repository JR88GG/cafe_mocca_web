# Guía de desarrollo — Backend Panadería IA

Herber: esto es una base **probada y funcionando** (la corrí y verifiqué antes
de dártela), no el proyecto completo. La idea es que tú y Rodrigo construyan
el resto siguiendo los dos patrones que ya están resueltos. Si algo no
entiendes, pregúntame esa parte puntual — mejor que entender el 100% de lo
poco que hay, que copiar el 100% de algo que no dominas.

## 1. Qué te estoy entregando y qué no

**Resuelto (puedes leerlo y entenderlo como referencia):**
- Estructura del proyecto, conexión a base de datos, configuración por variables de entorno.
- Las 9 tablas del diseño normalizado, ya como modelos de SQLAlchemy.
- Seguridad base: hashing de contraseñas, JWT, protección de rutas por rol, límite de intentos de login.
- Un endpoint de autenticación completo (registro + login).
- Un CRUD completo de Categorías (el caso más simple).

**Pendiente (lo construyen ustedes, seccion 5 trae el detalle):**
- Productos, Inventario, Pedidos, Detalle de pedido, Personalización.
- Historial de ventas y Sugerencias de IA.
- El módulo de IA en sí (el cálculo de precio/cantidad sugerida).

## 2. Cómo está organizado el proyecto

```
app/
├── main.py          # arma la app, registra los routers, seguridad global
├── config.py        # lee y valida las variables de entorno (.env)
├── database.py       # conexión a la base de datos
├── security.py       # hashing de contraseñas + creación/lectura de JWT
├── models.py          # las 9 tablas (SQLAlchemy)
├── schemas.py         # formas de entrada/salida de datos (Pydantic)
├── dependencies.py    # "guardias" que protegen rutas (login/rol admin)
└── routers/
    ├── auth.py        # ejemplo resuelto: registro y login
    └── categorias.py  # ejemplo resuelto: CRUD simple
```

La razón de esta separación: cada archivo tiene una sola responsabilidad.
Si mañana cambian de SQLite a PostgreSQL, solo tocan `database.py` y el
`.env` — nada más se entera del cambio.

## 3. Medidas de seguridad ya incluidas (y por qué)

| Medida | Dónde | Por qué importa |
|---|---|---|
| Contraseñas con hash (bcrypt) | `security.py` | Si alguien roba la base de datos, no obtiene contraseñas legibles |
| Tokens JWT con expiración | `security.py`, `.env` | La sesión no dura para siempre; limita el daño si un token se filtra |
| Rutas protegidas por rol | `dependencies.py` | Un cliente no puede ejecutar acciones de administrador aunque adivine la URL |
| Límite de intentos de login | `routers/auth.py` (`slowapi`) | Dificulta que alguien adivine contraseñas por fuerza bruta |
| Variables de entorno para secretos | `config.py`, `.env` | La clave secreta y la conexión a la BD nunca quedan en el código ni en GitHub |
| Validación de datos de entrada | `schemas.py` (Pydantic) | Rechaza automáticamente datos con formato incorrecto antes de tocar la base de datos |
| CORS restringido | `main.py` | Solo el dominio del frontend autorizado puede llamar a la API |
| Nunca se expone `password_hash` | `schemas.UsuarioOut` | Ninguna respuesta de la API revela ni siquiera el hash de la contraseña |

Cuando construyan Pedidos, apliquen la misma lógica: por ejemplo, un cliente
solo debería poder ver **sus propios** pedidos, no los de otros — eso lo
resuelven comparando `pedido.usuario_id` contra el `usuario.id` que devuelve
`get_current_user`.

## 4. Cómo funcionan los dos patrones ya resueltos

### Patrón A — Autenticación (`routers/auth.py`)

1. `/auth/registro` recibe nombre/email/contraseña, revisa que el correo no
   exista, guarda la contraseña **ya hasheada** (nunca la original) y
   devuelve el usuario sin su contraseña.
2. `/auth/login` recibe email/contraseña, busca al usuario, compara la
   contraseña con `verify_password` (nunca comparando texto plano), y si
   coincide genera un token JWT con `create_access_token`. Ese token es lo
   que el frontend guarda y envía en cada petición siguiente
   (`Authorization: Bearer <token>`).
3. `dependencies.get_current_user` es lo que lee ese token en cada petición
   protegida y recupera quién es el usuario. `get_current_admin` además
   exige que su rol sea admin.

Este patrón se reutiliza tal cual para **cualquier** endpoint que necesite
saber "quién está pidiendo esto" — no hay que reinventarlo.

### Patrón B — CRUD simple (`routers/categorias.py`)

Cuatro operaciones siempre con la misma forma: `listar` (público), `crear`,
`actualizar`, `eliminar` (estas tres exigen `get_current_admin`). Cada una:
recibe datos validados por un schema, consulta/modifica la base de datos con
`db.query(...)`, y devuelve la respuesta con el schema de salida.

## 5. Tareas pendientes — quién hace qué

### Rodrigo (sigue el Patrón B — CRUD simple)

1. **Productos** — copia `routers/categorias.py`, cámbialo para el modelo
   `Producto`. Necesitas primero agregar `ProductoCreate` y `ProductoOut` en
   `schemas.py` (mismo estilo que `CategoriaCreate`/`CategoriaOut`, pero con
   los campos de producto: nombre, categoria_id, descripcion, precio_base,
   imagen_url, activo).
2. **Inventario** — similar, pero normalmente solo se actualiza la cantidad
   (no se "crea" inventario suelto, se crea junto con el producto). Puede
   ser un único endpoint `PUT /inventario/{producto_id}` para ajustar
   `cantidad_disponible`.
3. Una vez existan estos endpoints, carga los datos de ejemplo (productos e
   historial de ventas simulado) usando `/auth/registro` para crear un
   usuario admin de prueba (tendrás que cambiarle el rol manualmente en la
   base de datos la primera vez, ya que el registro público siempre crea
   clientes) y luego usando los endpoints de productos/categorías.
4. Prueba cada endpoint que Herber vaya terminando desde `/docs` y documenta
   los resultados.

### Herber (combina el Patrón A y B, más lógica propia)

1. **Pedidos + Detalle de pedido + Personalización** — esto es más complejo
   porque son 3 tablas relacionadas en una sola operación: al crear un
   pedido, creas el `Pedido`, luego cada `DetallePedido` (uno por producto
   pedido) y, si aplica, su `Personalizacion`. Usa `get_current_user` (no
   `get_current_admin`, cualquier cliente logueado puede pedir) y asegúrate
   de asignar `usuario_id = usuario.id` automáticamente — nunca confíes en
   un `usuario_id` que venga del formulario del cliente.
2. **Endpoint "mis pedidos"** — filtra `Pedido` por
   `usuario_id == usuario_actual.id`. Este es el ejemplo perfecto de "un
   cliente solo ve lo suyo" mencionado en la sección 3.
3. **Historial de ventas y Sugerencias de IA** — estas tablas casi no
   necesitan endpoints de escritura manual (se llenan automáticamente
   cuando se completa un pedido, o con los datos de ejemplo de Rodrigo).
   Sí necesitan un endpoint de lectura para el panel admin.
4. **Módulo de IA** — para esta primera versión no necesitas un modelo de
   machine learning completo. Puedes empezar con una función simple: por
   cada producto, calcular el promedio de `cantidad_vendida` de
   `HistorialVenta` en los últimos 30 días y sugerir esa cantidad a
   producir (más adelante pueden mejorarlo con `scikit-learn`). Guarda el
   resultado en `SugerenciaIA` y expón un endpoint admin para consultarlo.
5. Revisa el trabajo de Rodrigo antes de integrarlo — confirma que siga el
   mismo estilo del resto del proyecto.

## 6. Cómo probar lo que van construyendo

Con el servidor corriendo (`uvicorn app.main:app --reload`), abran
`http://127.0.0.1:8000/docs`. Ahí pueden probar cada endpoint sin necesitar
Postman: FastAPI genera esa documentación interactiva automáticamente a
partir del código.

## 7. Cronograma actualizado

El primer avance (base de datos normalizada + mockups) ya está resuelto —
Jaime se encarga de los mockups y la base de datos ya está en
`roadmap_concepto_panaderia_ia.md`. Este backend es para adelantar camino
hacia la entrega del proyecto completo, en aproximadamente un mes:

| Semana | Meta |
|---|---|
| 1 | Este backend corriendo localmente + Productos e Inventario (Rodrigo) + mockups terminados (Jaime) |
| 2 | Pedidos, Detalle de pedido, Personalización (Herber) + Productos/Inventario probados (Rodrigo) + frontend consumiendo catálogo y login |
| 3 | Módulo de IA (versión simple) + Historial de ventas + Sugerencias de IA + panel admin conectado |
| 4 | Integración completa frontend-backend, revisión de seguridad, pulido y ensayo de la entrega final |

## 8. Si se atoran

Pídeme ayuda con la parte puntual donde estén atorados (por ejemplo "no
entiendo por qué mi endpoint de Productos da error 422") en vez de pedir que
te resuelva todo el endpoint de nuevo — así construyes el criterio para
defenderlo en la sustentación del proyecto.
