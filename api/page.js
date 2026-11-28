// يخدم صفحات /p/<slug> بنفس index.html لكن برابط مانيفست واسم أيقونة مدمجين من أول بايت.
// السبب: آيفون يقرأ المانيفست كما هو معلن في الـ HTML عند فتح الصفحة ولا ينتظر تبديل
// الجافاسكربت للرابط (ثبت بفيديو عميلة 2026-11-26: الأيقونة كانت تفتح الرئيسية دائماً).
// عند أي فشل نرجع تحويلاً للرابط الكلاسيكي /?page=<slug> الذي يعمل دائماً.
var SHEET_ID = "1lm-t74RuBaR7q3-9-yF74LhaYRlByr0oywvaPQ9B1Gk";

function escHtml_(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fixDrive_(url) {
  var u = String(url || "");
  var m = u.match(/\/d\/([a-zA-Z0-9_-]+)/) || u.match(/id=([a-zA-Z0-9_-]+)/);
  return m && m[1] ? "https://lh3.googleusercontent.com/d/" + m[1] : u;
}

// جلب اسم الفقيد وصورته من الشيت (لاسم الأيقونة ومعاينة واتساب) — يفشل بصمت عند أي مشكلة
function lookupPerson_(slug) {
  var tq = encodeURIComponent("select B, D where A = '" + slug + "'");
  var url = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/gviz/tq?tqx=out:json&headers=1&tq=" + tq;
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, 3000);
  return fetch(url, { signal: ctrl.signal })
    .then(function (r) { return r.text(); })
    .then(function (txt) {
      clearTimeout(timer);
      var d = JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1));
      var rows = (d.table && d.table.rows) || [];
      if (rows.length && rows[0].c && rows[0].c[0] && rows[0].c[0].v) {
        return {
          name: String(rows[0].c[0].v),
          photo: fixDrive_(rows[0].c[1] && rows[0].c[1].v ? String(rows[0].c[1].v) : "")
        };
      }
      return null;
    })
    .catch(function () { clearTimeout(timer); return null; });
}

module.exports = async function handler(req, res) {
  var slug = "";
  try {
    slug = String((req.query && req.query.slug) || "")
      .replace(/[\s"'<>&#?\/]/g, "")
      .slice(0, 80);
  } catch (e) {}

  if (!slug) {
    res.writeHead(302, { Location: "/" });
    return res.end();
  }

  try {
    var proto = String((req.headers && req.headers["x-forwarded-proto"]) || "https").split(",")[0];
    var host = (req.headers && req.headers.host) || "www.al-baqiyat.site";
    var base = process.env.SELF_BASE_URL || proto + "://" + host;

    var results = await Promise.all([
      fetch(base + "/index.html").then(function (r) { return r.text(); }),
      lookupPerson_(slug)
    ]);
    var html = results[0];
    var person = results[1];
    var name = person && person.name ? person.name : "";

    // ١) رابط المانيفست الخاص بالصفحة مدمجاً من أول بايت
    html = html.replace(
      '<link rel="manifest" href="/manifest.json">',
      '<link rel="manifest" href="/api/manifest?page=' + encodeURIComponent(slug) + '">'
    );

    // ٢) اسم الأيقونة على آيفون = اسم الفقيد نفسه
    if (name) {
      html = html.replace(
        '<meta name="apple-mobile-web-app-title" content="الباقيات">',
        '<meta name="apple-mobile-web-app-title" content="' + escHtml_(name) + '">'
      );
    }

    // ٣) وسوم معاينة واتساب/المشاركة باسم الفقيد وصورته
    var ogTitle = name ? "صدقة جارية لروح " + name + " | الباقيات" : "الباقيات | صدقة جارية وأثر باقٍ";
    var og =
      '<meta property="og:title" content="' + escHtml_(ogTitle) + '">' +
      '<meta property="og:description" content="صفحة صدقة جارية: مصحف كامل، إذاعة قرآن، سبحة وأدعية، ودفتر عزاء — ادعُ له بالرحمة وشارك الأجر.">' +
      '<meta property="og:type" content="website">' +
      '<meta property="og:url" content="https://al-baqiyat.site/p/' + encodeURIComponent(slug) + '">';
    if (person && person.photo) {
      og += '<meta property="og:image" content="' + escHtml_(person.photo) + '">';
    }
    html = html.replace("</head>", og + "\n</head>");

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
    return res.status(200).send(html);
  } catch (e) {
    res.writeHead(302, { Location: "/?page=" + encodeURIComponent(slug) });
    return res.end();
  }
};
