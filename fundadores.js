// Atualiza o contador do lote 1 e a lista de Fundadores a partir da função
// founder-board. Se a busca falhar, ficam os valores escritos no HTML.
(function () {
  var URL = "https://ysbbyknhnusivprotutt.supabase.co/functions/v1/founder-board";
  var left = document.getElementById("lot-left");
  var fill = document.querySelector(".lot-fill");
  var bar = document.querySelector(".lot-bar");
  var list = document.getElementById("founders-list");
  var section = document.getElementById("founders-section");
  if (!left || !fill || !bar) return;
  fetch(URL, { headers: { Accept: "application/json" } })
    .then(function (r) { if (!r.ok) throw new Error("status"); return r.json(); })
    .then(function (d) {
      if (!d || !Number.isInteger(d.sold) || !Number.isInteger(d.total) || d.total < 1) return;
      var sold = Math.max(0, Math.min(d.sold, d.total));
      left.textContent = String(d.total - sold);
      fill.style.width = Math.round((sold / d.total) * 100) + "%";
      bar.setAttribute("aria-label", sold + " de " + d.total + " vagas do lote 1 preenchidas");
      if (list && section && Array.isArray(d.names) && d.names.length) {
        d.names.slice(0, 100).forEach(function (n) {
          if (typeof n !== "string") return;
          var li = document.createElement("li");
          li.textContent = n;
          list.appendChild(li);
        });
        section.hidden = false;
      }
    })
    .catch(function () {});
})();
