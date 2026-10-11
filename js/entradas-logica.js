/* Lógica pura del formulario de entradas (la usa entradas.js y la prueban en adef-api/tests/web.test.js). */
(function (raiz) {
  "use strict";
    var TIPOS_ARCHIVO = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

  function precio(precios, tipo, porcentaje, cantidad) {
    return Math.round((Number(precios[tipo]) || 0) * Number(porcentaje) / 100 * cantidad);
  }
  function plata(n) {
    return "$" + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  function textoTile(ev) {
    if (ev.pasado) return (ev.descripcion ? ev.descripcion + " · " : "") + "Concierto pasado";
    return ev.fecha + (ev.hora ? " " + ev.hora : "") + (ev.descripcion ? " · " + ev.descripcion : "");
  }
  /* "Niños — hasta 7 años (sin cargo)": nombre, aclaración opcional (notaWeb) y descuento. */
  function textoCategoria(c) {
    var p = Number(c.porcentaje);
    var nota = typeof c.nota === "string" ? c.nota.trim() : "";
    var base = c.nombre + (nota ? " — " + nota : "");
    if (p === 0) return base + " (sin cargo)";
    if (p > 0 && p < 100) return base + " (" + (100 - p) + "% de descuento)";
    return base;
  }
  function etiqueta(ev) {
    if (ev.pasado) return "";
    if (ev.disponibles <= 0) return "Agotado";
    if (ev.disponibles < 10) return "¡Últimas entradas!";
    return "";
  }
  function slug(s) {
    return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  var MAX_CATEGORIAS = 3, MAX_ENTRADAS = 20;
  /* Mismas reglas y mensajes que validarCompra en adef-api (src/reglas.js). */
  function problemaItems(items, total) {
    if (!items || !items.length) return "Elegí al menos una entrada.";
    if (items.length > MAX_CATEGORIAS) return "Podés combinar hasta " + MAX_CATEGORIAS + " categorías por compra.";
    var vistas = {}, suma = 0;
    for (var i = 0; i < items.length; i++) {
      var it = items[i], n = it.cantidad;
      if (vistas[it.categoria]) return "No se puede repetir una categoría en la misma compra.";
      vistas[it.categoria] = true;
      if (!(Number.isInteger(n) && n >= 1 && n <= MAX_ENTRADAS)) return "La cantidad tiene que ser entre 1 y " + MAX_ENTRADAS + ".";
      if (es2x1(it.categoria) && n % 2 !== 0) return "Con la categoría 2x1 la cantidad tiene que ser par (2, 4, 6…).";
      suma += n;
    }
    if (suma > MAX_ENTRADAS) return "Podés pedir hasta " + MAX_ENTRADAS + " entradas por compra.";
    if (total === 0 && suma > 4) return "Para entradas sin cargo podés pedir hasta 4 por vez.";
    return null;
  }
  /* cantidades: { nombreCategoria: n }. Devuelve las líneas del pedido (solo n > 0, en el orden de las categorías),
     los items para la API, la cantidad total, el precio lleno (subtotal), el descuento y el total. */
  function calcularPedido(precios, tipo, categorias, cantidades) {
    var lineas = [];
    categorias.forEach(function (c) {
      var n = Number(cantidades[c.nombre]) || 0;
      if (n > 0) lineas.push({ categoria: c.nombre, cantidad: n, precio: precio(precios, tipo, c.porcentaje, n), lleno: precio(precios, tipo, 100, n) });
    });
    var suma = function (k) { return lineas.reduce(function (s, l) { return s + l[k]; }, 0); };
    var subtotal = suma("lleno"), total = suma("precio");
    return {
      lineas: lineas,
      items: lineas.map(function (l) { return { categoria: l.categoria, cantidad: l.cantidad }; }),
      cantidad: suma("cantidad"), subtotal: subtotal, total: total, descuento: subtotal - total,
    };
  }
  function textoPedido(items) {
    return items.map(function (i) { return i.cantidad + " × " + i.categoria; }).join(", ");
  }
  /* Abono trimestral: 3 conciertos concretos, distintos, del ciclo por venir (mismo mensaje que el servidor). */
  var CONCIERTOS_TRIMESTRE = 3;
  var MSG_TRIMESTRE = "Elegí 3 conciertos distintos del ciclo por venir.";
  function elegiblesTrimestre(eventos) {
    return eventos.filter(function (e) { return !e.pasado && e.disponibles > 0; });
  }
  /* "Ópera (17/10) · Tango (14/11) · …" en el orden de la lista de eventos (por fecha). */
  function textoConciertos(eventos, ids) {
    return eventos.filter(function (e) { return ids.indexOf(e.id) >= 0; })
      .map(function (e) { return e.nombre + " (" + e.fecha + ")"; }).join(" · ");
  }
  function trimestreValido(ids) {
    if (!Array.isArray(ids) || ids.length !== CONCIERTOS_TRIMESTRE) return false;
    return ids.every(function (id, i) { return id && ids.indexOf(id) === i; });
  }
  function validarFormulario(c, total, archivo) {
    if (c.tipo === "Suelta" && !c.eventoId) return "Elegí el concierto.";
    if (c.tipo === "Trimestral" && !trimestreValido(c.conciertos)) return MSG_TRIMESTRE;
    var pi = problemaItems(c.items, total);
    if (pi) return pi;
    if (!c.nombre || c.nombre.trim().length < 2) return "Completá tu nombre y apellido.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((c.email || "").trim())) return "Revisá tu mail.";
    if (!/^[0-9+()\s-]{6,30}$/.test((c.telefono || "").trim())) return "Revisá tu teléfono.";
    if (total > 0) {
      if (!archivo) return "Subí el comprobante de la transferencia.";
      if (TIPOS_ARCHIVO.indexOf(archivo.type) < 0) return "El comprobante tiene que ser JPG, PNG o PDF.";
      if (archivo.size > 8 * 1024 * 1024) return "El comprobante pesa más de 8 MB.";
    }
    return null;
  }
  function es2x1(nombre) {
    return /^2x1/i.test(nombre || "");
  }
  /* Aviso sobre el concierto pedido por enlace (?evento=) si ya no se puede comprar; "" si está a la venta o no existe. */
  function avisoEvento(ev) {
    if (!ev) return "";
    if (ev.pasado) return "Ese concierto ya pasó";
    if (ev.disponibles <= 0) return "Ese concierto está agotado";
    return "";
  }
  /* Panel, pestaña Referidos: números de un referido sobre las filas de ventas (una por categoría).
     Pedidos/entradas/aprobado cuentan solo aprobadas (las del panel no tienen estado = aprobadas).
     Con porcentaje null ("a definir") no se calcula comisión: generado y aPagar quedan null. */
  function resumenReferido(ref, ventas) {
    var suyas = (ventas || []).filter(function (v) { return v.referido === ref.codigo; });
    var aprobadas = suyas.filter(function (v) { return (v.estado || "aprobada") === "aprobada"; });
    var suma = function (lista, k) { return lista.reduce(function (s, v) { return s + (Number(v[k]) || 0); }, 0); };
    var pedidos = {};
    aprobadas.forEach(function (v) { pedidos[String(v.pedido != null ? v.pedido : v.id)] = true; });
    var aprobado = suma(aprobadas, "price");
    var pagado = suma(ref.pagos || [], "monto");
    var pct = ref.porcentaje;
    var generado = pct === null || pct === undefined || pct === "" ? null : Math.round(aprobado * Number(pct) / 100);
    return {
      pedidos: Object.keys(pedidos).length, entradas: suma(aprobadas, "quantity"), aprobado: aprobado,
      pendiente: suma(suyas.filter(function (v) { return v.estado === "pendiente"; }), "price"),
      generado: generado, pagado: pagado, aPagar: generado === null ? null : generado - pagado,
    };
  }
  var api = { resumenReferido: resumenReferido, calcularPedido: calcularPedido, textoPedido: textoPedido, MAX_CATEGORIAS: MAX_CATEGORIAS, MAX_ENTRADAS: MAX_ENTRADAS, es2x1: es2x1, avisoEvento: avisoEvento, CONCIERTOS_TRIMESTRE: CONCIERTOS_TRIMESTRE, elegiblesTrimestre: elegiblesTrimestre, textoConciertos: textoConciertos, precio: precio, plata: plata, textoTile: textoTile, textoCategoria: textoCategoria, etiqueta: etiqueta, slug: slug, validarFormulario: validarFormulario };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.EntradasLogica = api;
})(this);
