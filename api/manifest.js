// مانيفست ديناميكي من الخادم نفسه: التطبيق المثبت من صفحة فقيد يفتح على نفس الصفحة.
// (سفاري/آيفون يجلب المانيفست من الخادم مباشرة ولا يمر على الـ Service Worker، فهذا الملف هو الضمان الأول)
module.exports = function handler(req, res) {
  var slug = "";
  try {
    slug = String((req.query && req.query.page) || "")
      .replace(/[\s"'<>&#?]/g, "")
      .slice(0, 80);
  } catch (e) {}

  var startUrl = slug ? "/?page=" + encodeURIComponent(slug) : "/";
  var manifest = {
    name: slug ? "صدقة جارية" : "منصة الباقيات",
    short_name: slug ? "صدقة جارية" : "الباقيات",
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
