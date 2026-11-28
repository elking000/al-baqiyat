// مانيفست ديناميكي من الخادم نفسه: التطبيق المثبت من صفحة فقيد يفتح على نفس الصفحة.
// (سفاري/آيفون يجلب المانيفست من الخادم مباشرة ولا يمر على الـ Service Worker، فهذا الملف هو الضمان الأول)
// من v24: عنوان البداية هو لينك /p/<slug> واسم التطبيق هو اسم الفقيد نفسه (يُجلب من الشيت).
var SHEET_ID = "1lm-t74RuBaR7q3-9-yF74LhaYRlByr0oywvaPQ9B1Gk";

function lookupName_(slug) {
  var tq = encodeURIComponent("select B where A = '" + slug + "'");
  var url = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/gviz/tq?tqx=out:json&headers=1&tq=" + tq;
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, 2500);
  return fetch(url, { signal: ctrl.signal })
    .then(function (r) { return r.text(); })
    .then(function (txt) {
      clearTimeout(timer);
      var d = JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1));
      var rows = (d.table && d.table.rows) || [];
      if (rows.length && rows[0].c && rows[0].c[0] && rows[0].c[0].v) return String(rows[0].c[0].v);
      return "";
    })
    .catch(function () { clearTimeout(timer); return ""; });
}

module.exports = async function handler(req, res) {
  var slug = "";
  try {
    slug = String((req.query && req.query.page) || "")
      .replace(/[\s"'<>&#?]/g, "")
      .slice(0, 80);
  } catch (e) {}

  var name = "";
  if (slug) {
    try { name = await lookupName_(slug); } catch (e) { name = ""; }
  }

  var startUrl = slug ? "/p/" + encodeURIComponent(slug) : "/";
  var appName = name || (slug ? "صدقة جارية" : "منصة الباقيات");
  var manifest = {
    name: appName,
    short_name: appName,
    id: startUrl,
    start_url: startUrl,
    scope: "/",
    display: "standalone",
    background_color: "#f8f9fa",
    theme_color: "#0f4c3a",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  };

  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).json(manifest);
};
