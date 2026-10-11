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
  function etiqueta(ev) {
    if (ev.pasado) return "";
    if (ev.disponibles <= 0) return "Agotado";
    if (ev.disponibles < 10) return "¡Últimas entradas!";
    return "";
  }
  function slug(s) {
    return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function validarFormulario(c, total, archivo) {
    if (c.tipo === "Suelta" && !c.eventoId) return "Elegí el concierto.";
    if (c.tipo === "Trimestral" && (!c.meses || c.meses.length !== 3)) return "Elegí 3 meses para el abono trimestral.";
    if (c.cantidad !== undefined && !(Number.isInteger(c.cantidad) && c.cantidad >= 1 && c.cantidad <= 10)) return "La cantidad tiene que ser de 1 a 10.";
    if (c.cantidad !== undefined && /^2x1/i.test(c.categoria || "") && c.cantidad % 2 !== 0) return "Con la categoría 2x1 la cantidad tiene que ser par (2, 4, 6…).";
    if (c.cantidad !== undefined && total === 0 && c.cantidad > 4) return "Para entradas sin cargo podés pedir hasta 4 por vez.";
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
  var api = { es2x1: es2x1, avisoEvento: avisoEvento, MESES_LARGOS: MESES_LARGOS, precio: precio, plata: plata, textoTile: textoTile, etiqueta: etiqueta, slug: slug, validarFormulario: validarFormulario };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.EntradasLogica = api;
})(this);
