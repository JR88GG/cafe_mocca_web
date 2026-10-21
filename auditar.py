import os
import re
import json

pantallas_jaime = [
    "index.html",
    "catalogo.html",
    "producto.html",
    "personalizar.html",
    "admin/dashboard.html",
    "admin/pedidos.html",
    "admin/catalogo.html"
]

errores = []
advertencias = []

print("=== INICIANDO AUDITORÍA FRONTEND CAFÉ MOCCA ===\n")

# 1. Auditar las 7 pantallas HTML de Jaime
for archivo in pantallas_jaime:
    if not os.path.exists(archivo):
        errores.append(f"[FALTA ARCHIVO] No existe {archivo}")
        continue

    with open(archivo, "r", encoding="utf-8") as f:
        contenido = f.read()

    if len(contenido.strip()) == 0:
        errores.append(f"[VACÍO] El archivo {archivo} está en blanco.")
        continue

    # Regla: Un solo <h1>
    h1_count = len(re.findall(r"<h1[\s>]", contenido, re.IGNORECASE))
    if h1_count != 1:
        errores.append(f"[{archivo}] Debe tener exactamente 1 <h1> (encontrados: {h1_count})")

    # Regla: Etiqueta <main>
    if "<main" not in contenido.lower():
        errores.append(f"[{archivo}] Falta la etiqueta semántica <main>")

    # Regla: Cero estilos en línea
    if re.search(r'\sstyle\s*=\s*["\']', contenido, re.IGNORECASE):
        errores.append(f"[{archivo}] Contiene atributos style=\"...\" en línea prohibidos")

    # Regla: Cero colores hexadecimales quemados en HTML
    hex_matches = re.findall(r"#[0-9a-fA-F]{3,6}\b", contenido)
    if hex_matches:
        errores.append(f"[{archivo}] Contiene colores hexadecimales quemados: {hex_matches}")

    # Regla: Un solo botón primario (.btn-primary)
    btn_primarios = len(re.findall(r"\bbtn-primary\b", contenido))
    if btn_primarios > 1:
        errores.append(f"[{archivo}] Tiene más de 1 botón primario .btn-primary ({btn_primarios})")

    # Regla: Imágenes con alt y archivos existentes
    imgs = re.findall(r"<img\s+[^>]*>", contenido, re.IGNORECASE)
    for img_tag in imgs:
        if "alt=" not in img_tag.lower():
            errores.append(f"[{archivo}] Imagen sin atributo alt: {img_tag}")
        src_match = re.search(r'src=["\']([^"\']+)["\']', img_tag)
        if src_match:
            src_ruta = src_match.group(1)
            ruta_limpia = src_ruta.replace("../", "")
            if not os.path.exists(ruta_limpia):
                errores.append(f"[{archivo}] Imagen rota (no existe el archivo): {ruta_limpia}")

    print(f"✔ Pantalla verificada: {archivo}")

# 2. Auditar seguridad en JS (Prohibido innerHTML)
for raiz, _, archivos in os.walk("js"):
    for nombre in archivos:
        if nombre.endswith(".js"):
            ruta_js = os.path.join(raiz, nombre)
            with open(ruta_js, "r", encoding="utf-8") as f:
                js_code = f.read()
            if ".innerHTML" in js_code:
                errores.append(f"[SEGURIDAD XSS] Se detectó uso de innerHTML en {ruta_js}")

# 3. Auditar peso de imágenes WebP (< 200 KB)
for raiz, _, archivos in os.walk("img"):
    for nombre in archivos:
        if nombre.endswith(".webp"):
            ruta_img = os.path.join(raiz, nombre)
            peso_kb = os.path.getsize(ruta_img) / 1024
            if peso_kb > 200:
                errores.append(f"[PESO IMAGEN] {ruta_img} pesa {peso_kb:.1f} KB (máximo permitido: 200 KB)")

# 4. Auditar JSON válidos en data/
for nombre in ["productos.json", "horarios.json", "insumos.json", "pedidos.json"]:
    ruta_json = os.path.join("data", nombre)
    if os.path.exists(ruta_json) and os.path.getsize(ruta_json) > 0:
        try:
            with open(ruta_json, "r", encoding="utf-8") as f:
                datos = json.load(f)
            if nombre == "productos.json":
                for p in datos:
                    if not os.path.exists(p.get("imagen_url", "")):
                        errores.append(f"[productos.json] No existe la foto: {p.get('imagen_url')}")
            print(f"✔ JSON válido: {ruta_json}")
        except Exception as e:
            errores.append(f"[JSON CORRUPTO] Error en {ruta_json}: {e}")

print("\n=== RESULTADO FINAL ===")
if not errores:
    print("🎉 ¡PERFECTO! 0 errores encontrados. Tus 7 pantallas cumplen el 100 % de las reglas.")
else:
    print(f"❌ Se encontraron {len(errores)} problemas por corregir:")
    for err in errores:
        print("  -", err)