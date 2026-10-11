/* Referidos: un link con ?r=<código en base64url> deja la cookie adef_ref=<código> por 30 días.
   Gana el PRIMER referido: si ya hay una cookie vigente, otro link no la pisa. El Worker valida el
   código al comprar (compra.js lo manda). Sin dependencias; lo prueba adef-api/tests/web.test.js.
   El panel lo carga con data-sin-cookie solo para armar los links. */
(function (raiz) {
  "use strict";
  var CODIGO = /^[a-z0-9-]{2,30}$/;
  var NOMBRE = "adef_ref", ALTA = "adef_ref_alta", MAX_AGE = 2592000; /* 30 días */
  var LINK_BASE = "https://adefvillaortuzar.com.ar/conciertos.html?r=";

  function codificar(codigo) {
    return btoa(String(codigo).toLowerCase()).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  /* Devuelve el código si `r` es base64url (sin padding) de un código con formato válido; si no, null. */
  function decodificar(r) {
    if (typeof r !== "string" || !/^[A-Za-z0-9_-]{2,60}$/.test(r)) return null;
    var b64 = r.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    var codigo;
    try { codigo = atob(b64); } catch (e) { return null; }
    return CODIGO.test(codigo) ? codigo : null;
  }
  function leer(cookie) {
    var m = String(cookie || "").match(/(?:^|;\s*)adef_ref=([^;]*)/);
    return m && CODIGO.test(m[1]) ? m[1] : null;
  }
  /* Qué código guardar: el del link, solo si no hay ya uno vigente. */
  function aGuardar(cookie, r) {
    if (leer(cookie)) return null;
    return decodificar(r);
  }
  function cookies(codigo, ahora, seguro) {
    var fin = "; max-age=" + MAX_AGE + "; path=/; SameSite=Lax" + (seguro ? "; Secure" : "");
    return [NOMBRE + "=" + codigo + fin, ALTA + "=" + encodeURIComponent(ahora.toISOString()) + fin];
  }
  /* La URL actual sin el parámetro r (ruta + query + hash), para history.replaceState. */
  function sinParametro(href) {
    var u = new URL(href);
    u.searchParams.delete("r");
    return u.pathname + u.search + u.hash;
  }
  function link(codigo) { return LINK_BASE + codificar(codigo); }

  var api = { codificar: codificar, decodificar: decodificar, leer: leer, aGuardar: aGuardar, cookies: cookies, sinParametro: sinParametro, link: link, LINK_BASE: LINK_BASE };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }
  raiz.AdefReferido = api;

  var script = document.currentScript;
  if (script && script.hasAttribute("data-sin-cookie")) return;
  try {
    var r = new URLSearchParams(location.search).get("r");
    if (r === null) return;
    var codigo = aGuardar(document.cookie, r);
    if (codigo) cookies(codigo, new Date(), location.protocol === "https:").forEach(function (c) { document.cookie = c; });
    if (history.replaceState) history.replaceState(history.state, "", sinParametro(location.href));
  } catch (e) { /* sin cookies o sin history: la compra sigue igual, sin referido */ }
})(this);
