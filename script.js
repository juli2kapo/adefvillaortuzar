/* ============================================================
   A de F Villa Ortúzar — Estudio de Baile
   Interacciones: menú móvil + animaciones al hacer scroll.
   ============================================================ */
(function () {
  "use strict";

  // Marca que JS está activo: recién entonces el CSS oculta los .reveal.
  // Si este script no corre, el contenido se ve siempre.
  document.documentElement.classList.add("js");

  /* ---------- Menú móvil (hamburguesa) ---------- */
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("primary-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    });

    // Cierra el menú al tocar un enlace (mejor en mobile)
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a") && nav.classList.contains("open")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Abrir menú");
      }
    });
  }

  /* ---------- Reveal al hacer scroll ---------- */
  var revealEls = [].slice.call(document.querySelectorAll(".reveal"));
  var showAll = function () {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  };

  if (!("IntersectionObserver" in window) || revealEls.length === 0) {
    showAll();
    return;
  }

  var observer = new IntersectionObserver(
    function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    // threshold 0 + margen negativo pequeño: aparece apenas asoma en pantalla.
    { threshold: 0, rootMargin: "0px 0px -60px 0px" }
  );

  revealEls.forEach(function (el) { observer.observe(el); });

  // Red de seguridad: si algo no se reveló (p. ej. el observer no disparó),
  // mostramos todo a los 3 s para que nunca quede contenido invisible.
  window.setTimeout(showAll, 3000);
})();
