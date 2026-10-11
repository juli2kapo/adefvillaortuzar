/* Lógica pura del formulario de entradas (la usa entradas.js y la prueban en adef-api/tests/web.test.js). */
(function (raiz) {
  "use strict";
  var MESES_LARGOS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
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
  function textoCategoria(c) {
    var p = Number(c.porcentaje);
    if (p === 0) return c.nombre + " (sin cargo)";
    if (p > 0 && p < 100) return c.nombre + " (" + (100 - p) + "% de descuento)";
    return c.nombre;
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
  var MAX_CATEGORIAS = 3, MAX_ENTRADAS = 10;
  /* Mismas reglas y mensajes que validarCompra en adef-api (src/reglas.js). */
  function problemaItems(items, total) {
    if (!items || !items.length) return "Elegí al menos una entrada.";
    if (items.length > MAX_CATEGORIAS) return "Podés combinar hasta " + MAX_CATEGORIAS + " categorías por compra.";
    var vistas = {}, suma = 0;
    for (var i = 0; i < items.length; i++) {
      var it = items[i], n = it.cantidad;
      if (vistas[it.categoria]) return "No se puede repetir una categoría en la misma compra.";
      vistas[it.categoria] = true;
      if (!(Number.isInteger(n) && n >= 1 && n <= MAX_ENTRADAS)) return "La cantidad tiene que ser entre 1 y 10.";
      if (es2x1(it.categoria) && n % 2 !== 0) return "Con la categoría 2x1 la cantidad tiene que ser par (2, 4, 6…).";
      suma += n;
    }
    if (suma > MAX_ENTRADAS) return "Podés pedir hasta 10 entradas por compra.";
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
  function validarFormulario(c, total, archivo) {
    if (c.tipo === "Suelta" && !c.eventoId) return "Elegí el concierto.";
    if (c.tipo === "Trimestral" && (!c.meses || c.meses.length !== 3)) return "Elegí 3 meses para el abono trimestral.";
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
  var api = { calcularPedido: calcularPedido, textoPedido: textoPedido, MAX_CATEGORIAS: MAX_CATEGORIAS, MAX_ENTRADAS: MAX_ENTRADAS, es2x1: es2x1, avisoEvento: avisoEvento, MESES_LARGOS: MESES_LARGOS, precio: precio, plata: plata, textoTile: textoTile, textoCategoria: textoCategoria, etiqueta: etiqueta, slug: slug, validarFormulario: validarFormulario };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.EntradasLogica = api;
})(this);
