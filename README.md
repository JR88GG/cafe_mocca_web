# Panadería IA — Backend (base de trabajo)

Este es el punto de partida del backend, **no el proyecto terminado**. Ya probé
que corre sin errores (registro, login, JWT, control de acceso admin y
límite de intentos de login funcionando). Lo que falta construir está
explicado paso a paso en `GUIA_DESARROLLO.md`.

## Arrancar el proyecto

```bash
python3 -m venv venv
# Windows: venv\Scripts\activate    |    Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
# Genera tu propia SECRET_KEY y pégala en .env:
python -c "import secrets; print(secrets.token_hex(32))"

uvicorn app.main:app --reload
```

Abre **http://127.0.0.1:8000/docs** — ahí puedes probar cada endpoint desde
el navegador (documentación interactiva automática de FastAPI).

## Qué ya funciona

- `POST /auth/registro` — crear una cuenta de cliente
- `POST /auth/login` — iniciar sesión y obtener un token JWT (máx. 5 intentos por minuto)
- `GET /categorias/` — listar categorías (público)
- `POST /categorias/`, `PUT /categorias/{id}`, `DELETE /categorias/{id}` — solo admin

## Qué falta (ver GUIA_DESARROLLO.md)

Productos, Inventario, Pedidos, Personalización, Historial de ventas,
Sugerencias de IA, y el módulo de IA en sí.
