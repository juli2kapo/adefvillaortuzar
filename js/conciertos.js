/* Conciertos: arma las tarjetas y los precios desde adef-api. La compra está en entradas.html (js/compra.js).
   Si la API no responde (o no hay conciertos a la venta), quedan las tarjetas de respaldo del HTML (con WhatsApp). */
(function () {
  "use strict";
  var L = window.EntradasLogica;
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var API = LOCAL ? "http://127.0.0.1:8787" : "https://api.adefvillaortuzar.com.ar";
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }

  function pintarTiles(datos, primeraVez) {
    if (!datos.eventos || !datos.eventos.length) return; // quedan las tarjetas de respaldo
    $("tiles").innerHTML = datos.eventos.map(function (ev) {
      var et = L.etiqueta(ev);
      var boton = ev.pasado ? "" : ev.disponibles > 0
        ? '<a class="btn-rect" href="entradas.html?evento=' + encodeURIComponent(ev.id) + '">Entradas</a>'
        : '<span class="tile-agotado">Agotado</span>';
      return '<article class="tile reveal is-visible" id="' + esc(L.slug(ev.nombre)) + '">' +
        '<div class="tile-media">' + (ev.imagen ? '<img src="' + esc(ev.imagen) + '" alt="' + esc(ev.nombre) + '" loading="lazy" />' : "") + "</div>" +
        '<h3 class="tile-title">' + esc(ev.nombre) + "</h3>" +
        '<p class="tile-text">' + esc(L.textoTile(ev)) + "</p>" +
        (et && et !== "Agotado" ? '<p class="tile-badge">' + esc(et) + "</p>" : "") +
        (ev.apoyoLogo || ev.apoyoTexto ? '<div class="lepi-support"><span>' + esc(ev.apoyoTexto || "Con el apoyo de") + "</span>" +
          (ev.apoyoLogo ? '<img src="' + esc(ev.apoyoLogo) + '" alt="" loading="lazy" />' : "") + "</div>" : "") +
        boton + "</article>";
    }).join("");
    if (primeraVez && location.hash) {
      try {
        var destino = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (destino) destino.scrollIntoView();
      } catch (e) { /* hash mal formado: se ignora */ }
    }
  }

  function pintarPrecios(datos) {
    $("precioSuelta").textContent = L.plata(datos.precios.Suelta);
    $("precioTrimestral").textContent = datos.ventaWeb.Trimestral ? L.plata(datos.precios.Trimestral) : "No disponible";
    $("precioAnual").textContent = datos.ventaWeb.Anual ? L.plata(datos.precios.Anual) : "No disponible";
    var abonos = $("btnAbonos");
    abonos.removeAttribute("target");
    abonos.removeAttribute("rel");
    abonos.setAttribute("href", "entradas.html?abono=1");
    if (!datos.ventaWeb.Trimestral && !datos.ventaWeb.Anual) abonos.textContent = "Entradas";
  }

  fetch(API + "/api/publico").then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }).then(function (d) {
    pintarTiles(d, true);
    pintarPrecios(d);
  }).catch(function () { /* quedan las tarjetas de respaldo con WhatsApp */ });
})();
