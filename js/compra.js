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
  var MSG_TURNSTILE = "No pudimos cargar la verificación anti-robots. Recargá la página o escribinos por WhatsApp.";
  var turnstileCaido = false;
  function pintarTurnstile() {
    if (widgetTs !== null || !window.turnstile || !datos) return;
    widgetTs = window.turnstile.render("#cTurnstile", {
      sitekey: SITEKEY, language: "es",
      callback: function (tok) { tokenTs = tok; if (turnstileCaido) { turnstileCaido = false; error(""); } },
      "expired-callback": function () { tokenTs = null; },
      "error-callback": function () { tokenTs = null; turnstileCaido = true; error(MSG_TURNSTILE); },
    });
  }
  /* Si el script de Cloudflare nunca carga (bloqueador, red), avisamos en vez de dejar el botón mudo. */
  setTimeout(function () {
    if (!window.turnstile) { turnstileCaido = true; error(MSG_TURNSTILE); }
  }, 10000);
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

  /* ---------- Categorías: un contador − n + por categoría (una compra puede combinar varias) ---------- */
  var cantidades = {};

  function cantidadesIniciales() {
    var cs = datos.categorias, inicial = {};
    var general = cs.filter(function (c) { return c.nombre === "General"; })[0] || cs[0];
    cs.forEach(function (c) { inicial[c.nombre] = c === general ? (L.es2x1(c.nombre) ? 2 : 1) : 0; });
    return inicial;
  }

  function paso(nombre) { return L.es2x1(nombre) ? 2 : 1; }

  function pintarCategorias() {
    $("cCategorias").innerHTML = datos.categorias.map(function (c, i) {
      var n = esc(c.nombre);
      return '<li class="categoria" data-i="' + i + '">' +
        '<div class="categoria-info"><span class="categoria-nombre">' + esc(L.textoCategoria(c)) + '</span>' +
        '<span class="categoria-precio" data-precio></span></div>' +
        '<div class="contador">' +
        '<button type="button" class="contador-btn" data-cat="' + i + '" data-delta="-1" aria-label="Quitar una entrada ' + n + '">−</button>' +
        '<output class="contador-n" aria-live="polite" aria-label="Entradas ' + n + '">0</output>' +
        '<button type="button" class="contador-btn" data-cat="' + i + '" data-delta="1" aria-label="Agregar una entrada ' + n + '">+</button>' +
        "</div></li>";
    }).join("");
  }

  function pedido() {
    return L.calcularPedido(datos.precios, $("cTipo").value, datos.categorias, cantidades);
  }

  /* Actualiza números, precios unitarios y botones de cada categoría sin repintar (no pierde el foco). */
  function refrescarCategorias(p) {
    var tipo = $("cTipo").value, usadas = p.items.length;
    [].slice.call($("cCategorias").children).forEach(function (li) {
      var c = datos.categorias[Number(li.getAttribute("data-i"))], n = cantidades[c.nombre] || 0, s = paso(c.nombre);
      var unit = L.precio(datos.precios, tipo, c.porcentaje, 1);
      li.querySelector("[data-precio]").textContent = unit === 0 ? "Sin cargo" : L.plata(unit) + (s === 2 ? " por persona, de a 2" : " c/u");
      li.querySelector(".contador-n").textContent = n;
      li.classList.toggle("con-entradas", n > 0);
      li.querySelector('[data-delta="-1"]').disabled = n === 0;
      // Pedido sin cargo: hasta 4 en total (mismo límite que el servidor).
      var tope = p.total === 0 && unit === 0 ? 4 : L.MAX_ENTRADAS;
      li.querySelector('[data-delta="1"]').disabled = p.cantidad + s > tope || (n === 0 && usadas >= L.MAX_CATEGORIAS);
    });
  }

  function leerFormulario() {
    var tipo = $("cTipo").value;
    return {
      tipo: tipo, eventoId: tipo === "Suelta" ? $("cEvento").value : "",
      conciertos: tipo === "Trimestral" ? conciertosElegidos() : undefined,
      items: pedido().items,
      nombre: $("cNombre").value.trim(), email: $("cEmail").value.trim(),
      telefono: $("cTelefono").value.trim(),
    };
  }

  function conciertosElegidos() {
    return [].slice.call($("cConciertos").querySelectorAll("input:checked")).map(function (i) { return i.value; });
  }

  /* Trimestral: al llegar a 3 se deshabilitan los demás; muestra cuántos van. */
  function refrescarConciertos() {
    var n = conciertosElegidos().length, max = L.CONCIERTOS_TRIMESTRE;
    [].slice.call($("cConciertos").querySelectorAll("input")).forEach(function (i) { i.disabled = !i.checked && n >= max; });
    $("cConciertosCuenta").textContent = "(" + n + " de " + max + ")";
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
      var elegidos = tipo === "Trimestral" ? L.textoConciertos(datos.eventos, conciertosElegidos()) : "";
      texto.textContent = tipo === "Anual" ? "Todos los conciertos que quedan del ciclo" : (elegidos || "3 conciertos del ciclo a elección");
      img.src = IMAGEN_ABONO;
      img.alt = "";
    }
    badge.textContent = et;
    badge.hidden = !et;
  }

  function actualizar() {
    var tipo = $("cTipo").value;
    $("campoEvento").hidden = tipo !== "Suelta";
    $("campoConciertos").hidden = tipo !== "Trimestral";
    refrescarConciertos();
    var p = pedido(), t = p.total;
    refrescarCategorias(p);
    $("cPrecioTexto").textContent = p.cantidad > 1 ? "Precio (" + p.cantidad + " entradas)" : "Precio";
    $("cSubtotal").textContent = L.plata(p.subtotal);
    var conDescuento = p.descuento > 0;
    if (conDescuento) $("cDescuento").textContent = "−" + L.plata(p.descuento);
    var fila = $("filaDescuento");
    if (conDescuento && fila.hidden) { fila.hidden = false; fila.style.animation = "none"; void fila.offsetWidth; fila.style.animation = ""; }
    fila.hidden = !conDescuento;
    $("cTotal").textContent = L.plata(t);
    var gratis = t === 0 && p.cantidad > 0;
    $("bloquePago").hidden = gratis;
    $("bloqueTransf").hidden = t === 0;
    $("pagoGratis").hidden = !gratis;
    resumen();
  }

  function prepararFormulario(params) {
    var tipos = [["Suelta", "Entrada suelta"]];
    if (datos.ventaWeb.Trimestral) tipos.push(["Trimestral", "Abono Trimestral"]);
    if (datos.ventaWeb.Anual) tipos.push(["Anual", "Abono Anual"]);
    opciones($("cTipo"), tipos);
    var aLaVenta = datos.eventos.filter(function (e) { return !e.pasado && e.disponibles > 0; });
    opciones($("cEvento"), [["", "Elegí el concierto…"]].concat(aLaVenta.map(function (e) { return [e.id, e.nombre + " — " + e.fecha]; })));
    $("cConciertos").innerHTML = L.elegiblesTrimestre(datos.eventos).map(function (e) {
      return '<label><input type="checkbox" value="' + esc(e.id) + '" /> ' + esc(e.nombre) + ' <span class="fecha-tri">' + esc(e.fecha) + "</span></label>";
    }).join("");
    pintarCategorias();
    cantidades = cantidadesIniciales();
    var t = datos.transferencia;
    $("tAlias").textContent = t.alias;
    $("tCbu").textContent = t.cbu;
    $("filaCbu").hidden = !t.cbu;
    $("tTitular").textContent = t.titular;
    $("filaTitular").hidden = !t.titular;

    var pedido = params.get("evento") ? evento(params.get("evento")) : null;
    var aviso = params.get("abono") === "1" ? "" : L.avisoEvento(pedido);
    $("avisoEvento").textContent = aviso;
    $("avisoEvento").hidden = !aviso;
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
    var c = leerFormulario();
    var t = pedido().total;
    var archivo = $("cArchivo").files[0] || null;
    var problema = L.validarFormulario(c, t, archivo);
    if (problema) return error(problema);
    if (!tokenTs) return error(turnstileCaido ? MSG_TURNSTILE : "Esperá un segundo a que termine la verificación anti-robots.");
    var boton = $("cEnviar");
    boton.disabled = true;
    var paso = t > 0
      ? (boton.textContent = "Subiendo comprobante…", subir(archivo, 2).then(function (r) { c.comprobante = { key: r.key, url: r.ufsUrl || r.url }; c.comprobanteTipo = archivo.type; }))
      : Promise.resolve();
    paso.then(function () {
      boton.textContent = "Enviando…";
      c.turnstile = tokenTs;
      /* Referido de la cookie (js/referido.js); el Worker lo valida y si no sirve lo ignora. */
      var ref = window.AdefReferido ? window.AdefReferido.leer(document.cookie) : null;
      if (ref) c.referido = ref;
      return fetch(API + "/api/compras", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(c) });
    }).then(function (res) {
      if (res.ok) return res.json().then(function (r) { olvidarReferido(); listo(r, c); });
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

  /* La compra ya quedó atribuida: sin cookie, una próxima visita sin link no es del referido.
     Si vuelve a entrar por un link de referido, se vuelve a guardar. */
  function olvidarReferido() {
    if (!window.AdefReferido) return;
    try {
      window.AdefReferido.olvidar(location.protocol === "https:").forEach(function (k) { document.cookie = k; });
    } catch (e) { /* sin cookies: nada que borrar */ }
  }

  function listo(r, c) {
    var items = r.items || [];
    var conciertos = c.tipo === "Trimestral" ? L.textoConciertos(datos.eventos, c.conciertos) : "";
    var que = conciertos ? r.evento + ": " + conciertos : r.evento + " (" + r.fecha + ")";
    $("compraListoTexto").textContent = que + " · " + r.cantidad + (r.cantidad === 1 ? " entrada" : " entradas") + " · Total " + L.plata(r.total) + ". Te escribimos a " + r.email + ".";
    $("compraListoDetalle").innerHTML = items.map(function (i) {
      return "<li>" + esc(i.cantidad) + " × " + esc(i.categoria) + " — " + esc(L.plata(i.precio)) + "</li>";
    }).join("");
    $("compraListoDetalle").hidden = !items.length;
    $("compraListoMail").firstChild.nodeValue = r.total === 0
      ? "Te llega un mail cuando confirmemos tu reserva. Si no lo ves, revisá spam o escribinos por "
      : "Te llega un mail cuando verifiquemos el pago. Si no lo ves, revisá spam o escribinos por ";
    $("compraForm").hidden = true;
    $("compraListo").hidden = false;
    $("compraListo").scrollIntoView({ block: "start" });
    $("compraForm").reset();
    cantidades = cantidadesIniciales();
    actualizar();
    reiniciarTurnstile();
  }

  /* Tras un 409 (cupo agotado): refresca concierto y cupos sin perder lo que escribió. */
  function recargarDatos() {
    var antes = leerFormulario();
    var conciertosAntes = antes.conciertos || [], cantAntes = cantidades;
    return fetch(API + "/api/publico").then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d) return;
      datos = d;
      prepararFormulario(new URLSearchParams(""));
      $("cTipo").value = antes.tipo;
      datos.categorias.forEach(function (c) { cantidades[c.nombre] = cantAntes[c.nombre] || 0; });
      if (antes.eventoId) $("cEvento").value = antes.eventoId;
      [].slice.call($("cConciertos").querySelectorAll("input")).forEach(function (i) { i.checked = conciertosAntes.indexOf(i.value) >= 0; });
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
  ["cTipo", "cEvento", "cConciertos"].forEach(function (id) {
    $(id).addEventListener("change", actualizar);
    $(id).addEventListener("input", actualizar);
  });
  $("cCategorias").addEventListener("click", function (e) {
    var b = e.target.closest("[data-cat]");
    if (!b || b.disabled) return;
    var c = datos.categorias[Number(b.getAttribute("data-cat"))];
    var n = (cantidades[c.nombre] || 0) + Number(b.getAttribute("data-delta")) * paso(c.nombre);
    cantidades[c.nombre] = Math.max(0, n);
    actualizar();
  });
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
