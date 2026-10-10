/* Página de compra de entradas (entradas.html): resumen en vivo, formulario y envío a adef-api. */
(function () {
  "use strict";
  var L = window.EntradasLogica;
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var API = LOCAL ? "http://127.0.0.1:8787" : "https://api.adefvillaortuzar.com.ar";
  var SITEKEY_PROD = "0x4AAAAAAFTMNkf9Vf6wZT72";
  var SITEKEY = LOCAL ? "1x00000000000000000000AA" : SITEKEY_PROD;
  var IMAGEN_ABONO = "images/conc-orquesta.jpg";
  var $ = function (id) { return document.getElementById(id); };
  var datos = null, tokenTs = null, widgetTs = null;

  /* ---------- Turnstile: se pinta cuando están listos el DOM y el script ---------- */
  function pintarTurnstile() {
    if (widgetTs !== null || !window.turnstile || !datos) return;
    widgetTs = window.turnstile.render("#cTurnstile", {
      sitekey: SITEKEY, language: "es",
      callback: function (tok) { tokenTs = tok; },
      "expired-callback": function () { tokenTs = null; },
    });
  }
  window.addEventListener("turnstile-listo", pintarTurnstile);

  function reiniciarTurnstile() {
    tokenTs = null;
    if (window.turnstile && widgetTs !== null) window.turnstile.reset(widgetTs);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }

  /* ---------- Formulario ---------- */
  function opciones(sel, items) {
    sel.innerHTML = items.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + "</option>"; }).join("");
  }

  function cantidadValida() {
    return Math.min(10, Math.max(1, Math.floor(Number($("cCantidad").value)) || 1));
  }

  function leerFormulario() {
    var meses = [].slice.call($("cMeses").querySelectorAll("input:checked")).map(function (i) { return Number(i.value); });
    return {
      tipo: $("cTipo").value, eventoId: $("cEvento").value, meses: meses,
      categoria: $("cCategoria").value, cantidad: cantidadValida(),
      nombre: $("cNombre").value.trim(), email: $("cEmail").value.trim(),
      telefono: $("cTelefono").value.trim(), documento: $("cDocumento").value.trim(),
    };
  }

  function total() {
    var c = leerFormulario();
    var cat = datos.categorias.filter(function (x) { return x.nombre === c.categoria; })[0];
    return cat ? L.precio(datos.precios, c.tipo, cat.porcentaje, c.cantidad) : 0;
  }

  function evento(id) {
    return datos.eventos.filter(function (e) { return e.id === id; })[0] || null;
  }

  function error(msg) {
    $("cError").textContent = msg;
    $("cError").hidden = !msg;
  }

  function resumen() {
    var tipo = $("cTipo").value;
    var img = $("resImg"), titulo = $("resTitulo"), texto = $("resTexto"), badge = $("resBadge");
    var ev = tipo === "Suelta" ? evento($("cEvento").value) : null;
    var et = "";
    if (tipo === "Suelta") {
      if (ev) {
        titulo.textContent = ev.nombre;
        texto.textContent = L.textoTile(ev);
        et = L.etiqueta(ev);
        img.src = ev.imagen || IMAGEN_ABONO;
        img.alt = ev.nombre;
      } else {
        titulo.textContent = "Elegí el concierto";
        texto.textContent = "Cuando lo elijas, vas a ver acá los datos.";
        img.src = IMAGEN_ABONO;
        img.alt = "";
      }
    } else {
      titulo.textContent = tipo === "Anual" ? "Abono Anual" : "Abono Trimestral";
      texto.textContent = tipo === "Anual" ? "Todos los conciertos que quedan del ciclo" : "3 meses del ciclo a elección";
      img.src = IMAGEN_ABONO;
      img.alt = "";
    }
    badge.textContent = et;
    badge.hidden = !et;
  }

  function actualizar() {
    var tipo = $("cTipo").value;
    $("campoEvento").hidden = tipo !== "Suelta";
    $("campoMeses").hidden = tipo !== "Trimestral";
    var t = total();
    $("cTotal").textContent = L.plata(t);
    $("bloquePago").hidden = t === 0;
    $("bloqueTransf").hidden = t === 0;
    $("pagoGratis").hidden = t !== 0;
    resumen();
  }

  function prepararFormulario(params) {
    var tipos = [["Suelta", "Entrada suelta"]];
    if (datos.ventaWeb.Trimestral) tipos.push(["Trimestral", "Abono Trimestral"]);
    if (datos.ventaWeb.Anual) tipos.push(["Anual", "Abono Anual"]);
    opciones($("cTipo"), tipos);
    var aLaVenta = datos.eventos.filter(function (e) { return !e.pasado && e.disponibles > 0; });
    opciones($("cEvento"), [["", "Elegí el concierto…"]].concat(aLaVenta.map(function (e) { return [e.id, e.nombre + " — " + e.fecha]; })));
    $("cMeses").innerHTML = datos.mesesTrimestre.map(function (m) {
      return '<label><input type="checkbox" value="' + esc(m) + '" /> ' + esc(L.MESES_LARGOS[m]) + "</label>";
    }).join("");
    opciones($("cCategoria"), datos.categorias.map(function (c) { return [c.nombre, c.nombre]; }));
    var t = datos.transferencia;
    $("tAlias").textContent = t.alias;
    $("tCbu").textContent = t.cbu;
    $("filaCbu").hidden = !t.cbu;
    $("tTitular").textContent = t.titular;
    $("filaTitular").hidden = !t.titular;

    var tipoInicial = "Suelta", eventoInicial = "";
    if (params.get("abono") === "1") {
      tipoInicial = datos.ventaWeb.Trimestral ? "Trimestral" : datos.ventaWeb.Anual ? "Anual" : "Suelta";
    } else if (params.get("evento") && aLaVenta.some(function (e) { return e.id === params.get("evento"); })) {
      eventoInicial = params.get("evento");
    }
    $("cTipo").value = tipoInicial;
    $("cEvento").value = eventoInicial;
    actualizar();
  }

  /* ---------- Envío ---------- */
  function subir(archivo, intentos) {
    return window.UT.uploadFiles("comprobante", { files: [archivo] }).then(function (r) { return r[0]; }, function (e) {
      if (intentos > 1) return subir(archivo, intentos - 1);
      throw e;
    });
  }

  function enviar(e) {
    e.preventDefault();
    error("");
    $("cCantidad").value = cantidadValida();
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
        if (res.status === 409) recargarDatos();
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
    $("compraListoTexto").textContent = r.evento + " (" + r.fecha + ") · " + r.cantidad + (r.cantidad === 1 ? " entrada" : " entradas") + " · " + L.plata(r.total) + ". Te escribimos a " + r.email + ".";
    $("compraForm").hidden = true;
    $("compraListo").hidden = false;
    $("compraListo").scrollIntoView({ block: "start" });
    $("compraForm").reset();
    actualizar();
    reiniciarTurnstile();
  }

  /* Tras un 409 (cupo agotado): refresca concierto y cupos sin perder lo que escribió. */
  function recargarDatos() {
    var antes = leerFormulario();
    var mesesAntes = antes.meses;
    return fetch(API + "/api/publico").then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d) return;
      datos = d;
      prepararFormulario(new URLSearchParams(""));
      $("cTipo").value = antes.tipo;
      $("cCategoria").value = antes.categoria;
      $("cCantidad").value = antes.cantidad;
      if (antes.eventoId) $("cEvento").value = antes.eventoId;
      [].slice.call($("cMeses").querySelectorAll("input")).forEach(function (i) { i.checked = mesesAntes.indexOf(Number(i.value)) >= 0; });
      actualizar();
    }).catch(function () {});
  }

  /* ---------- Arranque ---------- */
  function mostrarFallo() {
    $("eCargando").hidden = true;
    $("eFallo").hidden = false;
  }

  document.addEventListener("click", function (e) {
    var cp = e.target.closest("[data-copiar]");
    if (cp && navigator.clipboard) {
      navigator.clipboard.writeText($(cp.getAttribute("data-copiar")).textContent);
      cp.textContent = "¡Copiado!";
      setTimeout(function () { cp.textContent = "Copiar"; }, 1500);
    }
  });
  ["cTipo", "cEvento", "cCategoria", "cCantidad", "cMeses"].forEach(function (id) {
    $(id).addEventListener("change", actualizar);
    $(id).addEventListener("input", actualizar);
  });
  $("cCantidad").addEventListener("change", function () { $("cCantidad").value = cantidadValida(); actualizar(); });
  $("cArchivo").addEventListener("change", function () {
    var f = $("cArchivo").files[0];
    $("cArchivoNombre").textContent = f ? f.name : "JPG, PNG o PDF, hasta 8 MB";
  });
  $("compraForm").addEventListener("submit", enviar);

  fetch(API + "/api/publico").then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }).then(function (d) {
    datos = d;
    prepararFormulario(new URLSearchParams(location.search));
    $("eCargando").hidden = true;
    $("eGrid").hidden = false;
    pintarTurnstile();
  }).catch(mostrarFallo);
})();
