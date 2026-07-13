/* ============================================================
   TONIGHT Admin — session gate + ribbon navigation
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Session check (defense in depth behind the middleware) ---------- */

  fetch("/api/me")
    .then(function (r) {
      if (!r.ok) throw new Error("unauthenticated");
      return r.json();
    })
    .then(function (me) {
      document.getElementById("userEmail").textContent = me.email;
    })
    .catch(function () {
      window.location.href = "/admin/login.html";
    });

  /* ---------- Ribbon navigation ---------- */

  var items = document.querySelectorAll(".ribbon__item");
  var sections = document.querySelectorAll(".panel-section");

  function show(name) {
    var found = false;
    sections.forEach(function (s) {
      var match = s.dataset.section === name;
      s.hidden = !match;
      if (match) found = true;
    });
    if (!found) { show("outbound"); return; }
    items.forEach(function (i) {
      i.classList.toggle("is-active", i.dataset.section === name);
    });
  }

  items.forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      var name = item.dataset.section;
      history.replaceState(null, "", "#" + name);
      show(name);
    });
  });

  window.addEventListener("hashchange", function () {
    show(location.hash.replace("#", "") || "outbound");
  });

  show(location.hash.replace("#", "") || "outbound");

  /* ---------- Sign out ---------- */

  document.getElementById("signOut").addEventListener("click", function () {
    fetch("/api/logout", { method: "POST" }).finally(function () {
      window.location.href = "/admin/login.html";
    });
  });
})();
