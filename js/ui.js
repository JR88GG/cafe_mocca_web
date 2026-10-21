const MoccaUI = {
  esRutaAdmin() {
    return window.location.pathname.includes("/admin/");
  },

  resolverRuta(rutaRelativa) {
    if (!rutaRelativa) return "";
    if (rutaRelativa.startsWith("http") || rutaRelativa.startsWith("../")) return rutaRelativa;
    return this.esRutaAdmin() ? `../${rutaRelativa}` : rutaRelativa;
  },

  formatearMoneda(monto) {
    const numero = Number.parseFloat(monto);
    if (Number.isNaN(numero)) return "$0.00";
    return new Intl.NumberFormat("es-SV", {
      style: "currency",
      currency: "USD"
    }).format(numero);
  },

  formatearFechaSV(fechaIso) {
    try {
      const fecha = new Date(fechaIso);
      return new Intl.DateTimeFormat("es-SV", {
        timeZone: "America/El_Salvador",
        dateStyle: "short",
        timeStyle: "short"
      }).format(fecha);
    } catch {
      return fechaIso;
    }
  },

  obtenerCarrito() {
    try {
      const guardado = localStorage.getItem("mocca_carrito");
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  },

  guardarCarrito(items) {
    localStorage.setItem("mocca_carrito", JSON.stringify(items));
    this.actualizarBadgeCarrito();
  },

  agregarAlCarrito(producto, cantidad = 1, personalizacion = null, precioCalculado = null) {
    const carrito = this.obtenerCarrito();
    const precioUnit = precioCalculado !== null ? precioCalculado : Number.parseFloat(producto.precio_base);

    if (!personalizacion) {
      const existente = carrito.find((item) => item.producto_id === producto.id && !item.personalizacion);
      if (existente) {
        existente.cantidad += cantidad;
        this.guardarCarrito(carrito);
        this.mostrarAviso(`Se actualizó "${producto.nombre}" en el carrito.`);
        return;
      }
    }

    carrito.push({
      producto_id: producto.id,
      nombre: producto.nombre,
      precio_unitario: precioUnit,
      imagen_url: producto.imagen_url,
      cantidad: cantidad,
      personalizacion: personalizacion
    });

    this.guardarCarrito(carrito);
    this.mostrarAviso(`Se agregó "${producto.nombre}" al carrito.`);
  },

  actualizarBadgeCarrito() {
    const badge = document.getElementById("nav-cart-count");
    if (!badge) return;
    const totalItems = this.obtenerCarrito().reduce((acc, item) => acc + item.cantidad, 0);
    badge.textContent = String(totalItems);
  },

  mostrarAviso(mensaje) {
    const toastEl = document.getElementById("mocca-toast");
    const toastBody = document.getElementById("mocca-toast-msg");
    if (!toastEl || !toastBody) return;
    toastBody.textContent = mensaje;
    if (window.bootstrap && window.bootstrap.Toast) {
      const toast = window.bootstrap.Toast.getOrCreateInstance(toastEl);
      toast.show();
    }
  },

  async cargarDatos(endpointUrl, mockJsonPath) {
    const url = USE_MOCK_DATA ? this.resolverRuta(mockJsonPath) : `${API_BASE_URL}${endpointUrl}`;
    const respuesta = await fetch(url);
    if (!respuesta.ok) {
      throw new Error(`Error HTTP ${respuesta.status}`);
    }
    return await respuesta.json();
  },

  async cargarHorariosFooter() {
    const lista = document.getElementById("footer-horarios-lista");
    if (!lista) return;
    try {
      const horarios = await this.cargarDatos("/horarios", "data/horarios.json");
      lista.replaceChildren();
      horarios.forEach((item) => {
        const li = document.createElement("li");
        li.className = "mb-1";
        const strong = document.createElement("strong");
        strong.textContent = `${item.dias}: `;
        const span = document.createElement("span");
        span.textContent = item.horario;
        li.appendChild(strong);
        li.appendChild(span);
        lista.appendChild(li);
      });
    } catch {
      lista.replaceChildren();
      const li = document.createElement("li");
      li.textContent = "Lun a vie 7:00 a.m.–5:30 p.m. · Sáb 7:30 a.m.–4:00 p.m. · Dom 8:00 a.m.–2:00 p.m.";
      lista.appendChild(li);
    }
  },

  crearBadgeEstadoPedido(estado) {
    const badge = document.createElement("span");
    badge.textContent = estado;
    switch (estado) {
      case "Recibido":
        badge.className = "mocca-badge mocca-badge-info";
        break;
      case "En preparación":
        badge.className = "mocca-badge mocca-badge-aviso";
        break;
      case "Listo":
        badge.className = "mocca-badge mocca-badge-ok";
        break;
      case "Entregado":
        badge.className = "mocca-badge mocca-badge-neutro";
        break;
      case "Cancelado":
        badge.className = "mocca-badge mocca-badge-error";
        break;
      default:
        badge.className = "mocca-badge mocca-badge-neutro";
    }
    return badge;
  },

  crearTarjetaProducto(producto) {
    const col = document.createElement("div");
    col.className = "col-12 col-sm-6 col-lg-4";

    const card = document.createElement("article");
    card.className = "mocca-card";

    const imgWrapper = document.createElement("div");
    imgWrapper.className = "mocca-card-img-wrapper";

    const badge = document.createElement("span");
    if (producto.es_personalizable) {
      badge.className = "mocca-badge mocca-badge-cereza mocca-badge-floating";
      badge.textContent = `Bajo pedido (${producto.horas_anticipacion}h)`;
    } else {
      badge.className = "mocca-badge mocca-badge-ok mocca-badge-floating";
      badge.textContent = "Disponible hoy";
    }
    imgWrapper.appendChild(badge);

    const img = document.createElement("img");
    img.className = "mocca-card-img";
    img.src = this.resolverRuta(producto.imagen_url);
    img.alt = `Fotografía de ${producto.nombre}`;
    img.width = 400;
    img.height = 300;
    img.loading = "lazy";
    imgWrapper.appendChild(img);

    const body = document.createElement("div");
    body.className = "mocca-card-body";

    const catTag = document.createElement("span");
    catTag.className = "small texto-suave mb-1";
    catTag.textContent = producto.categoria;

    const title = document.createElement("h3");
    title.className = "h5 mb-2";
    const titleLink = document.createElement("a");
    titleLink.href = `producto.html?id=${encodeURIComponent(producto.id)}`;
    titleLink.className = "text-decoration-none";
    titleLink.textContent = producto.nombre;
    title.appendChild(titleLink);

    const desc = document.createElement("p");
    desc.className = "small texto-suave flex-grow-1 mb-3";
    desc.textContent = producto.descripcion;

    const footerRow = document.createElement("div");
    footerRow.className = "d-flex align-items-center justify-content-between mt-auto pt-2 border-top";

    const price = document.createElement("span");
    price.className = "mocca-price";
    price.textContent = this.formatearMoneda(producto.precio_base);

    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "btn-mocca-secondary";

    if (producto.es_personalizable) {
      actionBtn.textContent = "Personalizar";
      actionBtn.addEventListener("click", () => {
        window.location.href = `personalizar.html?id=${encodeURIComponent(producto.id)}`;
      });
    } else {
      actionBtn.textContent = "Agregar";
      actionBtn.addEventListener("click", () => {
        this.agregarAlCarrito(producto, 1);
      });
    }

    footerRow.appendChild(price);
    footerRow.appendChild(actionBtn);

    body.appendChild(catTag);
    body.appendChild(title);
    body.appendChild(desc);
    body.appendChild(footerRow);

    card.appendChild(imgWrapper);
    card.appendChild(body);
    col.appendChild(card);

    return col;
  },

  async inicializarHome() {
    const contenedor = document.getElementById("home-destacados-grid");
    const estado = document.getElementById("home-estado");
    if (!contenedor || !estado) return;

    try {
      const productos = await this.cargarDatos("/productos", "data/productos.json");
      const destacados = productos.filter((p) => p.activo && p.destacado);
      estado.classList.add("d-none");
      contenedor.replaceChildren();

      if (destacados.length === 0) {
        estado.classList.remove("d-none");
        estado.textContent = "No hay platillos destacados disponibles en este momento.";
        return;
      }

      destacados.forEach((prod) => {
        contenedor.appendChild(this.crearTarjetaProducto(prod));
      });
    } catch {
      estado.classList.remove("d-none");
      estado.textContent = "No pudimos cargar las especialidades del Bistro. Intenta recargar la página.";
    }
  },

  async inicializarCatalogo() {
    const grid = document.getElementById("catalogo-grid");
    const estado = document.getElementById("catalogo-estado");
    const buscador = document.getElementById("catalogo-buscar");
    const chipsContainer = document.getElementById("catalogo-chips");
    if (!grid || !estado) return;

    let productosGlobal = [];
    let categoriaActual = "Todos";

    const renderizar = () => {
      const texto = buscador ? buscador.value.trim().toLowerCase() : "";
      const filtrados = productosGlobal.filter((p) => {
        if (!p.activo) return false;
        const coincideCat = categoriaActual === "Todos" || p.categoria === categoriaActual;
        const coincideTexto =
          p.nombre.toLowerCase().includes(texto) ||
          p.descripcion.toLowerCase().includes(texto) ||
          (p.alergenos && p.alergenos.toLowerCase().includes(texto));
        return coincideCat && coincideTexto;
      });

      grid.replaceChildren();
      if (filtrados.length === 0) {
        estado.classList.remove("d-none");
        estado.textContent = "No encontramos productos que coincidan con tu búsqueda.";
        return;
      }

      estado.classList.add("d-none");
      filtrados.forEach((prod) => {
        grid.appendChild(this.crearTarjetaProducto(prod));
      });
    };

    try {
      productosGlobal = await this.cargarDatos("/productos", "data/productos.json");
      renderizar();

      if (buscador) {
        buscador.addEventListener("input", renderizar);
      }

      if (chipsContainer) {
        const botones = chipsContainer.querySelectorAll("button[data-categoria]");
        botones.forEach((btn) => {
          btn.addEventListener("click", () => {
            botones.forEach((b) => {
              b.classList.remove("active");
              b.setAttribute("aria-pressed", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-pressed", "true");
            categoriaActual = btn.getAttribute("data-categoria") || "Todos";
            renderizar();
          });
        });
      }
    } catch {
      estado.classList.remove("d-none");
      estado.textContent = "No pudimos cargar el menú de Café Mocca. Verifica tu conexión y reintenta.";
    }
  },

  async inicializarDetalleProducto() {
    const contenedor = document.getElementById("detalle-producto-contenido");
    const estado = document.getElementById("detalle-estado");
    if (!contenedor || !estado) return;

    const params = new URLSearchParams(window.location.search);
    const idParam = Number.parseInt(params.get("id") || "1", 10);

    try {
      const productos = await this.cargarDatos("/productos", "data/productos.json");
      const producto = productos.find((p) => p.id === idParam) || productos[0];

      if (!producto) {
        estado.textContent = "El producto solicitado no existe.";
        return;
      }

      estado.classList.add("d-none");
      contenedor.classList.remove("d-none");

      const img = document.getElementById("detalle-img");
      img.src = this.resolverRuta(producto.imagen_url);
      img.alt = `Fotografía detallada de ${producto.nombre}`;

      document.getElementById("detalle-categoria").textContent = producto.categoria;
      document.getElementById("detalle-titulo").textContent = producto.nombre;
      document.getElementById("detalle-precio").textContent = this.formatearMoneda(producto.precio_base);
      document.getElementById("detalle-descripcion").textContent = producto.descripcion;
      document.getElementById("detalle-alergenos").textContent = producto.alergenos || "Ninguno reportado";

      const badge = document.getElementById("detalle-badge");
      if (producto.es_personalizable) {
        badge.className = "mocca-badge mocca-badge-cereza";
        badge.textContent = `Bajo pedido (${producto.horas_anticipacion}h de anticipación)`;
      } else {
        badge.className = "mocca-badge mocca-badge-ok";
        badge.textContent = "Disponible hoy en vitrina y bistro";
      }

      const inputCant = document.getElementById("detalle-cantidad");
      const btnMenos = document.getElementById("btn-cant-menos");
      const btnMas = document.getElementById("btn-cant-mas");
      const btnAccion = document.getElementById("detalle-btn-principal");

      btnMenos.addEventListener("click", () => {
        const actual = Number.parseInt(inputCant.value, 10) || 1;
        if (actual > 1) inputCant.value = String(actual - 1);
      });

      btnMas.addEventListener("click", () => {
        const actual = Number.parseInt(inputCant.value, 10) || 1;
        if (actual < 20) inputCant.value = String(actual + 1);
      });

      if (producto.es_personalizable) {
        btnAccion.textContent = "Personalizar este pastel";
        btnAccion.addEventListener("click", () => {
          window.location.href = `personalizar.html?id=${encodeURIComponent(producto.id)}`;
        });
      } else {
        btnAccion.textContent = "Agregar al pedido";
        btnAccion.addEventListener("click", () => {
          const cant = Number.parseInt(inputCant.value, 10) || 1;
          this.agregarAlCarrito(producto, cant);
        });
      }
    } catch {
      estado.classList.remove("d-none");
      estado.textContent = "Error al cargar la información del producto.";
    }
  },

  async inicializarPersonalizar() {
    const form = document.getElementById("form-personalizar");
    if (!form) return;

    const selectTamano = document.getElementById("pers-tamano");
    const selectRelleno = document.getElementById("pers-relleno");
    const checkExtraFresas = document.getElementById("pers-extra-fresas");
    const checkExtraMacarons = document.getElementById("pers-extra-macarons");
    const inputFecha = document.getElementById("pers-fecha");
    const inputDedicatoria = document.getElementById("pers-dedicatoria");
    const inputNotas = document.getElementById("pers-notas");
    const spanBase = document.getElementById("pers-precio-base");
    const spanRecargos = document.getElementById("pers-precio-recargos");
    const spanTotal = document.getElementById("pers-precio-total");

    // Bloquear fechas menores a 24 horas hacia adelante
    const manana = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const yyyy = manana.getFullYear();
    const mm = String(manana.getMonth() + 1).padStart(2, "0");
    const dd = String(manana.getDate()).padStart(2, "0");
    const minDateStr = `${yyyy}-${mm}-${dd}`;
    inputFecha.min = minDateStr;
    inputFecha.value = minDateStr;

    let productoBase = {
      id: 6,
      nombre: "Pastel de Chocolate & Oreo Personalizable (Ejemplo)",
      precio_base: "27.99",
      imagen_url: "img/productos/pasteleria-encargo-frutas.webp"
    };

    try {
      const productos = await this.cargarDatos("/productos", "data/productos.json");
      const encontrado = productos.find((p) => p.es_personalizable);
      if (encontrado) productoBase = encontrado;
    } catch {
      // Usa el fallback local
    }

    const precioBaseNum = Number.parseFloat(productoBase.precio_base) || 27.99;

    const recalcularTotal = () => {
      const recargoTamano = Number.parseFloat(selectTamano.selectedOptions[0].dataset.recargo || "0");
      const recargoRelleno = Number.parseFloat(selectRelleno.selectedOptions[0].dataset.recargo || "0");
      const recargoFresas = checkExtraFresas.checked ? Number.parseFloat(checkExtraFresas.dataset.recargo || "0") : 0;
      const recargoMacarons = checkExtraMacarons.checked ? Number.parseFloat(checkExtraMacarons.dataset.recargo || "0") : 0;

      const sumaRecargos = recargoTamano + recargoRelleno + recargoFresas + recargoMacarons;
      const totalEstimado = precioBaseNum + sumaRecargos;

      spanBase.textContent = this.formatearMoneda(precioBaseNum);
      spanRecargos.textContent = `+${this.formatearMoneda(sumaRecargos)}`;
      spanTotal.textContent = this.formatearMoneda(totalEstimado);
      return totalEstimado;
    };

    selectTamano.addEventListener("change", recalcularTotal);
    selectRelleno.addEventListener("change", recalcularTotal);
    checkExtraFresas.addEventListener("change", recalcularTotal);
    checkExtraMacarons.addEventListener("change", recalcularTotal);
    recalcularTotal();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (inputFecha.value < minDateStr) {
        inputFecha.classList.add("is-invalid");
        return;
      }
      inputFecha.classList.remove("is-invalid");

      const totalEstimado = recalcularTotal();
      const detallePers = {
        tamano: selectTamano.value,
        sabor_relleno: selectRelleno.value,
        mensaje: inputDedicatoria.value.trim(),
        fecha_entrega_deseada: inputFecha.value,
        notas: inputNotas.value.trim()
      };

      this.agregarAlCarrito(productoBase, 1, detallePers, totalEstimado);
    });
  },

  async inicializarAdminDashboard() {
    const tbody = document.getElementById("dashboard-pedidos-tbody");
    const kpiAlertas = document.getElementById("kpi-inventario-bajo");
    if (!tbody) return;

    try {
      const [pedidos, insumos] = await Promise.all([
        this.cargarDatos("/pedidos", "data/pedidos.json"),
        this.cargarDatos("/insumos", "data/insumos.json")
      ]);

      const bajos = insumos.filter((i) => i.estado === "Bajo" || i.estado === "Sin stock");
      if (kpiAlertas) {
        kpiAlertas.textContent = `${bajos.length} alertas activas`;
      }

      tbody.replaceChildren();
      pedidos.slice(0, 5).forEach((ped) => {
        const tr = document.createElement("tr");

        const tdId = document.createElement("td");
        const strongId = document.createElement("strong");
        strongId.textContent = ped.codigo;
        tdId.appendChild(strongId);

        const tdCliente = document.createElement("td");
        tdCliente.textContent = ped.cliente_nombre;

        const tdDetalle = document.createElement("td");
        tdDetalle.textContent = ped.detalle_resumen;

        const tdEntrega = document.createElement("td");
        tdEntrega.className = "small texto-suave";
        tdEntrega.textContent = ped.tipo_entrega;

        const tdTotal = document.createElement("td");
        tdTotal.className = "mocca-price fs-6";
        tdTotal.textContent = this.formatearMoneda(ped.total);

        const tdEstado = document.createElement("td");
        tdEstado.appendChild(this.crearBadgeEstadoPedido(ped.estado));

        tr.appendChild(tdId);
        tr.appendChild(tdCliente);
        tr.appendChild(tdDetalle);
        tr.appendChild(tdEntrega);
        tr.appendChild(tdTotal);
        tr.appendChild(tdEstado);
        tbody.appendChild(tr);
      });
    } catch {
      tbody.replaceChildren();
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.className = "text-center texto-suave py-4";
      td.textContent = "No se pudieron cargar los datos recientes del Dashboard.";
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
  },

  async inicializarAdminPedidos() {
    const tbody = document.getElementById("admin-pedidos-tbody");
    const inputBuscar = document.getElementById("pedidos-buscar");
    const selectEstado = document.getElementById("pedidos-filtro-estado");
    if (!tbody) return;

    let pedidosLista = [];

    const renderizarTabla = () => {
      const q = inputBuscar ? inputBuscar.value.trim().toLowerCase() : "";
      const est = selectEstado ? selectEstado.value : "Todos";

      const filtrados = pedidosLista.filter((p) => {
        const coincideEstado = est === "Todos" || p.estado === est;
        const coincideTexto =
          p.codigo.toLowerCase().includes(q) ||
          p.cliente_nombre.toLowerCase().includes(q) ||
          p.cliente_telefono.toLowerCase().includes(q);
        return coincideEstado && coincideTexto;
      });

      tbody.replaceChildren();
      if (filtrados.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 7;
        td.className = "text-center texto-suave py-4";
        td.textContent = "No hay pedidos que coincidan con los filtros seleccionados.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }

      filtrados.forEach((ped) => {
        const tr = document.createElement("tr");

        // Col 1: ID + Fecha
        const tdId = document.createElement("td");
        const divId = document.createElement("div");
        divId.className = "fw-bold";
        divId.textContent = ped.codigo;
        const divFecha = document.createElement("div");
        divFecha.className = "small texto-suave";
        divFecha.textContent = this.formatearFechaSV(ped.fecha);
        tdId.appendChild(divId);
        tdId.appendChild(divFecha);

        // Col 2: Cliente + Contacto
        const tdCli = document.createElement("td");
        const divNom = document.createElement("div");
        divNom.className = "fw-semibold";
        divNom.textContent = ped.cliente_nombre;
        const divTel = document.createElement("div");
        divTel.className = "small texto-suave";
        divTel.textContent = ped.cliente_telefono;
        tdCli.appendChild(divNom);
        tdCli.appendChild(divTel);

        // Col 3: Detalle
        const tdDet = document.createElement("td");
        tdDet.textContent = ped.detalle_resumen;

        // Col 4: Entrega y Pago
        const tdEnt = document.createElement("td");
        const divTipo = document.createElement("div");
        divTipo.className = "small";
        divTipo.textContent = ped.tipo_entrega;
        const divPago = document.createElement("div");
        divPago.className = "small texto-suave";
        divPago.textContent = `Pago: ${ped.metodo_pago}`;
        tdEnt.appendChild(divTipo);
        tdEnt.appendChild(divPago);

        // Col 5: Total
        const tdTot = document.createElement("td");
        tdTot.className = "mocca-price fs-6";
        tdTot.textContent = this.formatearMoneda(ped.total);

        // Col 6: Badge Estado
        const tdEst = document.createElement("td");
        tdEst.appendChild(this.crearBadgeEstadoPedido(ped.estado));

        // Col 7: Selector rápido de cambio de estado
        const tdAcc = document.createElement("td");
        const selectCambiar = document.createElement("select");
        selectCambiar.className = "form-select form-select-sm";
        selectCambiar.setAttribute("aria-label", `Cambiar estado de pedido ${ped.codigo}`);
        ["Recibido", "En preparación", "Listo", "Entregado", "Cancelado"].forEach((opcion) => {
          const opt = document.createElement("option");
          opt.value = opcion;
          opt.textContent = opcion;
          if (ped.estado === opcion) opt.selected = true;
          selectCambiar.appendChild(opt);
        });

        selectCambiar.addEventListener("change", () => {
          ped.estado = selectCambiar.value;
          renderizarTabla();
          this.mostrarAviso(`Estado de ${ped.codigo} actualizado a "${ped.estado}".`);
        });

        tdAcc.appendChild(selectCambiar);

        tr.appendChild(tdId);
        tr.appendChild(tdCli);
        tr.appendChild(tdDet);
        tr.appendChild(tdEnt);
        tr.appendChild(tdTot);
        tr.appendChild(tdEst);
        tr.appendChild(tdAcc);
        tbody.appendChild(tr);
      });
    };

    try {
      pedidosLista = await this.cargarDatos("/pedidos", "data/pedidos.json");
      renderizarTabla();
      if (inputBuscar) inputBuscar.addEventListener("input", renderizarTabla);
      if (selectEstado) selectEstado.addEventListener("change", renderizarTabla);
    } catch {
      tbody.replaceChildren();
    }
  },

  async inicializarAdminCatalogo() {
    const tbody = document.getElementById("admin-catalogo-tbody");
    const selectDisponibilidad = document.getElementById("cat-disponibilidad");
    const inputHoras = document.getElementById("cat-horas");
    const btnAgregarInsumo = document.getElementById("btn-agregar-linea-receta");
    const tbodyReceta = document.getElementById("receta-tbody");
    if (!tbody) return;

    if (selectDisponibilidad && inputHoras) {
      selectDisponibilidad.addEventListener("change", () => {
        if (selectDisponibilidad.value === "bajo_pedido") {
          inputHoras.disabled = false;
          inputHoras.value = "24";
        } else {
          inputHoras.disabled = true;
          inputHoras.value = "0";
        }
      });
    }

    try {
      const productos = await this.cargarDatos("/productos", "data/productos.json");
      tbody.replaceChildren();

      productos.forEach((prod) => {
        const tr = document.createElement("tr");

        const tdId = document.createElement("td");
        tdId.className = "fw-bold";
        tdId.textContent = `#CAT-00${prod.id}`;

        const tdProd = document.createElement("td");
        const divNom = document.createElement("div");
        divNom.className = "fw-semibold";
        divNom.textContent = prod.nombre;
        const divAlerg = document.createElement("div");
        divAlerg.className = "small texto-suave";
        divAlerg.textContent = `Alérgenos: ${prod.alergenos || "Ninguno"}`;
        tdProd.appendChild(divNom);
        tdProd.appendChild(divAlerg);

        const tdCat = document.createElement("td");
        tdCat.textContent = prod.categoria;

        const tdModalidad = document.createElement("td");
        const badgeMod = document.createElement("span");
        if (prod.es_personalizable) {
          badgeMod.className = "mocca-badge mocca-badge-cereza";
          badgeMod.textContent = `Personalizable (${prod.horas_anticipacion}h)`;
        } else {
          badgeMod.className = "mocca-badge mocca-badge-ok";
          badgeMod.textContent = "Disponible hoy";
        }
        tdModalidad.appendChild(badgeMod);

        const tdPrecio = document.createElement("td");
        tdPrecio.className = "mocca-price fs-6";
        tdPrecio.textContent = this.formatearMoneda(prod.precio_base);

        const tdEstado = document.createElement("td");
        const badgeVis = document.createElement("span");
        badgeVis.className = prod.activo ? "mocca-badge mocca-badge-ok" : "mocca-badge mocca-badge-neutro";
        badgeVis.textContent = prod.activo ? "Público" : "Oculto";
        tdEstado.appendChild(badgeVis);

        tr.appendChild(tdId);
        tr.appendChild(tdProd);
        tr.appendChild(tdCat);
        tr.appendChild(tdModalidad);
        tr.appendChild(tdPrecio);
        tr.appendChild(tdEstado);
        tbody.appendChild(tr);
      });
    } catch {
      // Manejo silencioso si falla la carga inicial
    }

    if (btnAgregarInsumo && tbodyReceta) {
      btnAgregarInsumo.addEventListener("click", () => {
        const selectIns = document.getElementById("receta-insumo-select");
        const inputCant = document.getElementById("receta-insumo-cant");
        if (!selectIns || !inputCant) return;

        const opt = selectIns.selectedOptions[0];
        const nombreInsumo = opt.textContent;
        const unidad = opt.dataset.unidad || "kg";
        const costoUnit = Number.parseFloat(opt.dataset.costo || "1.50");
        const cant = Number.parseFloat(inputCant.value) || 0.2;
        const costoLinea = costoUnit * cant;

        const tr = document.createElement("tr");
        const tdIns = document.createElement("td");
        tdIns.textContent = nombreInsumo;
        const tdCant = document.createElement("td");
        tdCant.textContent = String(cant);
        const tdUni = document.createElement("td");
        tdUni.textContent = unidad;
        const tdCosto = document.createElement("td");
        tdCosto.className = "fw-semibold";
        tdCosto.textContent = this.formatearMoneda(costoLinea);

        tr.appendChild(tdIns);
        tr.appendChild(tdCant);
        tr.appendChild(tdUni);
        tr.appendChild(tdCosto);
        tbodyReceta.appendChild(tr);

        this.mostrarAviso("Insumo agregado a la receta del producto.");
      });
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  MoccaUI.actualizarBadgeCarrito();
  MoccaUI.cargarHorariosFooter();
  MoccaUI.inicializarHome();
  MoccaUI.inicializarCatalogo();
  MoccaUI.inicializarDetalleProducto();
  MoccaUI.inicializarPersonalizar();
  MoccaUI.inicializarAdminDashboard();
  MoccaUI.inicializarAdminPedidos();
  MoccaUI.inicializarAdminCatalogo();
});