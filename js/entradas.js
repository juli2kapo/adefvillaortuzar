/* Entradas online: arma las tarjetas desde adef-api y maneja el formulario de compra.
   Si la API no responde, quedan las tarjetas de respaldo del HTML (con WhatsApp). */
(function () {
  "use strict";
  var L = window.EntradasLogica;
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var API = LOCAL ? "http://127.0.0.1:8787" : "https://api.adefvillaortuzar.com.ar";
  var SITEKEY_PROD = "0x4AAAAAAFTMNkf9Vf6wZT72";
  var SITEKEY = LOCAL ? "1x00000000000000000000AA" : SITEKEY_PROD;
  var $ = function (id) { return document.getElementById(id); };
  var datos = null, tokenTs = null, widgetTs = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }

  /* ---------- Tarjetas y precios ---------- */
  function pintarTiles() {
    $("tiles").innerHTML = datos.eventos.map(function (ev) {
      var et = L.etiqueta(ev);
      var boton = ev.pasado ? "" : ev.disponibles > 0
        ? '<button type="button" class="btn-rect" data-evento="' + esc(ev.id) + '">Entradas</button>'
        : '<span class="tile-agotado">Agotado</span>';
      return '<article class="tile reveal is-visible" id="' + esc(L.slug(ev.nombre)) + '">' +
        '<div class="tile-media">' + (ev.imagen ? '<img src="' + esc(ev.imagen) + '" alt="' + esc(ev.nombre) + '" loading="lazy" />' : "") + "</div>" +
        '<h3 class="tile-title">' + esc(ev.nombre) + "</h3>" +
        '<p class="tile-text">' + esc(L.textoTile(ev)) + "</p>" +
        (et && et !== "Agotado" ? '<p class="tile-badge">' + esc(et) + "</p>" : "") +
        (ev.apoyoLogo ? '<div class="lepi-support"><span>Con el apoyo de</span><img src="' + esc(ev.apoyoLogo) + '" alt="" loading="lazy" /></div>' : "") +
        boton + "</article>";
    }).join("");
    if (location.hash) {
      var destino = document.getElementById(location.hash.slice(1));
      if (destino) destino.scrollIntoView();
    }
  }

  function pintarPrecios() {
    $("precioSuelta").textContent = L.plata(datos.precios.Suelta);
    $("precioTrimestral").textContent = datos.ventaWeb.Trimestral ? L.plata(datos.precios.Trimestral) : "No disponible";
    $("precioAnual").textContent = datos.ventaWeb.Anual ? L.plata(datos.precios.Anual) : "No disponible";
    var abonos = $("btnAbonos");
    abonos.removeAttribute("target");
    abonos.setAttribute("href", "#");
    if (!datos.ventaWeb.Trimestral && !datos.ventaWeb.Anual) abonos.textContent = "Entradas";
  }

  /* ---------- Modal ---------- */
  function opciones(sel, items) {
    sel.innerHTML = items.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + "</option>"; }).join("");
  }

  function prepararModal(tipo, eventoId) {
    var tipos = [["Suelta", "Entrada suelta"]];
    if (datos.ventaWeb.Trimestral) tipos.push(["Trimestral", "Abono Trimestral"]);
    if (datos.ventaWeb.Anual) tipos.push(["Anual", "Abono Anual"]);
    opciones($("cTipo"), tipos);
    $("cTipo").value = tipos.some(function (t) { return t[0] === tipo; }) ? tipo : "Suelta";
    var aLaVenta = datos.eventos.filter(function (e) { return !e.pasado && e.disponibles > 0; });
    opciones($("cEvento"), [["", "Elegí el concierto…"]].concat(aLaVenta.map(function (e) { return [e.id, e.nombre + " — " + e.fecha]; })));
    $("cEvento").value = eventoId || "";
    $("cMeses").innerHTML = datos.mesesTrimestre.map(function (m) {
      return '<label><input type="checkbox" value="' + m + '" /> ' + L.MESES_LARGOS[m] + "</label>";
    }).join("");
    opciones($("cCategoria"), datos.categorias.map(function (c) { return [c.nombre, c.nombre]; }));
    var t = datos.transferencia;
    $("tAlias").textContent = t.alias;
    $("tCbu").textContent = t.cbu;
    $("filaCbu").hidden = !t.cbu;
    $("tTitular").textContent = t.titular;
    $("filaTitular").hidden = !t.titular;
    $("compraPasos").hidden = false;
    $("compraListo").hidden = true;
    error("");
    actualizar();
  }

  function leerFormulario() {
    var meses = [].slice.call($("cMeses").querySelectorAll("input:checked")).map(function (i) { return Number(i.value); });
    return {
      tipo: $("cTipo").value, eventoId: $("cEvento").value, meses: meses,
      categoria: $("cCategoria").value, cantidad: Number($("cCantidad").value),
      nombre: $("cNombre").value.trim(), email: $("cEmail").value.trim(),
      telefono: $("cTelefono").value.trim(), documento: $("cDocumento").value.trim(),
    };
  }

  function total() {
    var c = leerFormulario();
    var cat = datos.categorias.filter(function (x) { return x.nombre === c.categoria; })[0];
    var cant = Math.min(10, Math.max(1, Math.floor(c.cantidad) || 1));
    return cat ? L.precio(datos.precios, c.tipo, cat.porcentaje, cant) : 0;
  }

  function actualizar() {
    var tipo = $("cTipo").value;
    $("campoEvento").hidden = tipo !== "Suelta";
    $("campoMeses").hidden = tipo !== "Trimestral";
    var t = total();
    $("cTotal").textContent = L.plata(t);
    $("bloquePago").hidden = t === 0;
  }

  function error(msg) {
    $("cError").textContent = msg;
    $("cError").hidden = !msg;
  }

  function abrir(tipo, eventoId) {
    prepararModal(tipo, eventoId);
    $("compra").showModal();
    if (window.turnstile && widgetTs === null) {
      widgetTs = window.turnstile.render("#cTurnstile", {
        sitekey: SITEKEY, language: "es",
        callback: function (tok) { tokenTs = tok; },
        "expired-callback": function () { tokenTs = null; },
      });
    }
  }

  function reiniciarTurnstile() {
    tokenTs = null;
    if (window.turnstile && widgetTs !== null) window.turnstile.reset(widgetTs);
  }

  function subir(archivo, intentos) {
    return window.UT.uploadFiles("comprobante", { files: [archivo] }).then(function (r) { return r[0]; }, function (e) {
      if (intentos > 1) return subir(archivo, intentos - 1);
      throw e;
    });
  }

  function enviar(e) {
    e.preventDefault();
    error("");
    var c = leerFormulario();
    var t = total();
    var archivo = $("cArchivo").files[0] || null;
    var problema = L.validarFormulario(c, t, archivo);
    if (problema) return error(problema);
    if (!tokenTs) return error("Esperá un segundo a que termine la verificación anti-robots.");
    var boton = $("cEnviar");
    boton.disabled = true;
    var paso = t > 0
      ? (boton.textContent = "Subiendo comprobante…", subir(archivo, 2).then(function (r) { c.comprobante = { key: r.key, url: r.ufsUrl || r.url }; }))
      : Promise.resolve();
    paso.then(function () {
      boton.textContent = "Enviando…";
      c.turnstile = tokenTs;
      return fetch(API + "/api/compras", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(c) });
    }).then(function (res) {
      if (res.ok) return res.json().then(listo);
      return res.text().then(function (msg) {
        reiniciarTurnstile();
        error(msg || "No pudimos registrar tu compra. Probá de nuevo.");
        if (res.status === 409) cargar();
      });
    }).catch(function () {
      reiniciarTurnstile();
      error("No pudimos enviar tu compra. Revisá tu conexión y probá de nuevo.");
    }).then(function () {
      boton.disabled = false;
      boton.textContent = "Enviar compra";
    });
  }

  function listo(r) {
    $("compraPasos").hidden = true;
    $("compraListo").hidden = false;
    $("compraListoTexto").textContent = r.evento + " (" + r.fecha + ") · " + r.cantidad + (r.cantidad === 1 ? " entrada" : " entradas") + " · " + L.plata(r.total) + ". Te escribimos a " + r.email + ".";
    $("compraForm").reset();
    reiniciarTurnstile();
    cargar();
  }

  /* ---------- Arranque ---------- */
  function cargar() {
    return fetch(API + "/api/publico").then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function (d) {
      datos = d;
      pintarTiles();
      pintarPrecios();
    }).catch(function () { /* quedan las tarjetas de respaldo con WhatsApp */ });
  }

  document.addEventListener("click", function (e) {
    if (!datos) return;
    var b = e.target.closest("[data-evento]");
    if (b) { e.preventDefault(); abrir("Suelta", b.getAttribute("data-evento")); return; }
    if (e.target.closest("#btnAbonos")) {
      e.preventDefault();
      abrir(datos.ventaWeb.Trimestral ? "Trimestral" : datos.ventaWeb.Anual ? "Anual" : "Suelta", "");
      return;
    }
    var cp = e.target.closest("[data-copiar]");
    if (cp && navigator.clipboard) {
      navigator.clipboard.writeText($(cp.getAttribute("data-copiar")).textContent);
      cp.textContent = "¡Copiado!";
      setTimeout(function () { cp.textContent = "Copiar"; }, 1500);
    }
  });
  ["cTipo", "cCategoria", "cCantidad", "cMeses"].forEach(function (id) {
    $(id).addEventListener("change", actualizar);
    $(id).addEventListener("input", actualizar);
  });
  $("compraForm").addEventListener("submit", enviar);
  $("compraCerrar").addEventListener("click", function () { $("compra").close(); });
  $("compraOtra").addEventListener("click", function () { $("compra").close(); });
  cargar();
})();
