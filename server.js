const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Setup folders ----------
const UPLOAD_DIR = path.join(__dirname, "uploads");
const ICON_DIR = path.join(__dirname, "uploads", "icons");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(ICON_DIR)) fs.mkdirSync(ICON_DIR, { recursive: true });

// ---------- Database ----------
const db = new Database(path.join(__dirname, "database.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    version TEXT,
    filename TEXT NOT NULL,
    icon_filename TEXT,
    size_bytes INTEGER,
    downloads INTEGER DEFAULT 0,
    uploaded_at TEXT DEFAULT (datetime('now'))
  )
`);

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());

// ---------- Multer storage config ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "icon") cb(null, ICON_DIR);
    else cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "apk") {
      const ok = file.originalname.toLowerCase().endsWith(".apk");
      if (!ok) return cb(new Error("Only .apk files are allowed for the app file"));
    }
    if (file.fieldname === "icon") {
      const okTypes = [".png", ".jpg", ".jpeg", ".webp"];
      const ok = okTypes.some(ext => file.originalname.toLowerCase().endsWith(ext));
      if (!ok) return cb(new Error("Icon must be png, jpg, jpeg or webp"));
    }
    cb(null, true);
  }
});

// =========================================================
// EMBEDDED CSS (shared by both pages)
// =========================================================
const CSS = `
  :root {
    --bg: #0f1117; --surface: #171a23; --surface-2: #1f2330;
    --border: #2a2f3d; --text: #eef0f5; --text-dim: #9aa1b2;
    --accent: #6c8dff; --accent-2: #8f6cff; --success: #3ecf8e; --radius: 14px;
  }
  * { box-sizing: border-box; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; background:var(--bg); color:var(--text); }
  a { color:inherit; text-decoration:none; }
  .topbar { display:flex; justify-content:space-between; align-items:center; padding:18px 32px; border-bottom:1px solid var(--border); position:sticky; top:0; background:rgba(15,17,23,0.9); backdrop-filter:blur(8px); z-index:10; }
  .brand { font-weight:700; font-size:1.2rem; }
  .topbar nav a { margin-left:24px; color:var(--text-dim); font-weight:500; padding-bottom:4px; border-bottom:2px solid transparent; transition:all .2s; }
  .topbar nav a:hover, .topbar nav a.active { color:var(--text); border-bottom-color:var(--accent); }
  .container { max-width:1100px; margin:0 auto; padding:32px 24px 80px; }
  .container.narrow { max-width:640px; }
  .hero { margin-bottom:28px; }
  .hero h1 { font-size:2rem; margin-bottom:6px; }
  .hero p { color:var(--text-dim); margin:0; }
  .controls { display:flex; gap:12px; margin-bottom:28px; flex-wrap:wrap; }
  .controls input, .controls select { background:var(--surface); border:1px solid var(--border); color:var(--text); padding:12px 14px; border-radius:10px; font-size:.95rem; outline:none; }
  .controls input { flex:1; min-width:220px; }
  .controls input:focus, .controls select:focus { border-color:var(--accent); }
  .app-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:18px; }
  .loading, .empty { color:var(--text-dim); grid-column:1/-1; text-align:center; padding:40px 0; }
  .app-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:18px; display:flex; flex-direction:column; gap:10px; cursor:pointer; transition:transform .15s ease, border-color .15s ease; }
  .app-card:hover { transform:translateY(-3px); border-color:var(--accent); }
  .app-card .icon { width:56px; height:56px; border-radius:14px; background:linear-gradient(135deg,var(--accent),var(--accent-2)); display:flex; align-items:center; justify-content:center; font-size:1.4rem; font-weight:700; overflow:hidden; }
  .app-card .icon img { width:100%; height:100%; object-fit:cover; }
  .app-card h3 { margin:0; font-size:1.05rem; }
  .app-card p.desc { color:var(--text-dim); font-size:.85rem; margin:0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .app-card .meta { display:flex; justify-content:space-between; font-size:.78rem; color:var(--text-dim); margin-top:auto; }
  .tag { display:inline-block; background:var(--surface-2); padding:3px 10px; border-radius:20px; font-size:.72rem; color:var(--accent); width:fit-content; }
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; z-index:100; }
  .modal-overlay.hidden { display:none; }
  .modal { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:28px; max-width:420px; width:90%; position:relative; }
  .modal-close { position:absolute; top:14px; right:14px; background:none; border:none; color:var(--text-dim); font-size:1.4rem; cursor:pointer; }
  .modal h2 { margin-top:0; }
  .modal .icon-lg { width:72px; height:72px; border-radius:18px; background:linear-gradient(135deg,var(--accent),var(--accent-2)); display:flex; align-items:center; justify-content:center; font-size:1.8rem; font-weight:700; overflow:hidden; margin-bottom:14px; }
  .modal .icon-lg img { width:100%; height:100%; object-fit:cover; }
  .download-btn { display:inline-block; background:var(--accent); color:#fff; padding:12px 20px; border-radius:10px; font-weight:600; border:none; cursor:pointer; margin-top:14px; width:100%; text-align:center; font-size:1rem; }
  .download-btn:hover { background:var(--accent-2); }
  .upload-form { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:28px; display:flex; flex-direction:column; gap:18px; }
  .upload-form label { display:flex; flex-direction:column; gap:6px; font-size:.9rem; color:var(--text-dim); font-weight:500; }
  .upload-form input[type="text"], .upload-form textarea { background:var(--surface-2); border:1px solid var(--border); color:var(--text); padding:12px 14px; border-radius:10px; font-size:.95rem; outline:none; font-family:inherit; resize:vertical; }
  .upload-form input:focus, .upload-form textarea:focus { border-color:var(--accent); }
  .row { display:flex; gap:14px; flex-wrap:wrap; }
  .row label { flex:1; min-width:160px; }
  .dropzone { border:2px dashed var(--border); border-radius:10px; padding:24px; text-align:center; color:var(--text-dim); cursor:pointer; transition:all .2s; font-size:.88rem; }
  .dropzone:hover, .dropzone.dragover { border-color:var(--accent); color:var(--text); background:rgba(108,141,255,.06); }
  .progress-wrap { background:var(--surface-2); border-radius:10px; height:30px; position:relative; overflow:hidden; }
  .progress-wrap.hidden { display:none; }
  .progress-bar { height:100%; width:0%; background:linear-gradient(90deg,var(--accent),var(--accent-2)); transition:width .15s ease; }
  #progressText { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:.8rem; font-weight:600; }
  button[type="submit"] { background:var(--accent); color:#fff; border:none; padding:14px; border-radius:10px; font-size:1rem; font-weight:600; cursor:pointer; transition:background .2s; }
  button[type="submit"]:hover { background:var(--accent-2); }
  button[type="submit"]:disabled { opacity:.6; cursor:not-allowed; }
  .status-msg { text-align:center; margin:0; font-size:.9rem; }
  .status-msg.success { color:var(--success); }
  .status-msg.error { color:#ff6b6b; }
  @media (max-width:600px) { .topbar{padding:14px 18px;} .container{padding:24px 16px 60px;} }
`;

// =========================================================
// EMBEDDED FRONTEND JS (shared by both pages)
// =========================================================
const CLIENT_JS = `
  function fmtSize(bytes) {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? mb.toFixed(1) + " MB" : (bytes / 1024).toFixed(0) + " KB";
  }
  function initials(name) { return name.trim().slice(0, 2).toUpperCase(); }

  if (document.getElementById("appGrid")) {
    const grid = document.getElementById("appGrid");
    const searchInput = document.getElementById("searchInput");
    const categorySelect = document.getElementById("categorySelect");
    const sortSelect = document.getElementById("sortSelect");
    const modalOverlay = document.getElementById("modalOverlay");
    const modalContent = document.getElementById("modalContent");
    const modalClose = document.getElementById("modalClose");
    let debounceTimer;

    async function loadCategories() {
      const res = await fetch("/api/categories");
      const cats = await res.json();
      categorySelect.innerHTML = '<option value="All">All Categories</option>' +
        cats.map(c => '<option value="' + c + '">' + c + '</option>').join("");
    }

    async function loadApps() {
      grid.innerHTML = '<p class="loading">Loading apps...</p>';
      const params = new URLSearchParams({
        q: searchInput.value || "",
        category: categorySelect.value || "All",
        sort: sortSelect.value || "newest"
      });
      const res = await fetch("/api/apps?" + params.toString());
      const apps = await res.json();

      if (apps.length === 0) {
        grid.innerHTML = '<p class="empty">No apps found. Try a different search or be the first to upload one!</p>';
        return;
      }

      grid.innerHTML = apps.map(function(app) {
        return '<a href="/app/' + app.id + '" class="app-card" data-id="' + app.id + '" style="color:inherit;">' +
          '<div class="icon">' + (app.icon_filename ? '<img src="/uploads/icons/' + app.icon_filename + '" alt="' + app.name + '" />' : initials(app.name)) + '</div>' +
          '<h3>' + app.name + '</h3>' +
          '<p class="desc">' + (app.description || "No description provided.") + '</p>' +
          '<span class="tag">' + app.category + '</span>' +
          '<div class="meta"><span>v' + app.version + '</span><span>' + app.downloads + ' downloads</span></div>' +
        '</a>';
      }).join("");

    }

    function openModal(id, apps) {
      const app = apps.find(function(a) { return String(a.id) === String(id); });
      if (!app) return;
      modalContent.innerHTML =
        '<div class="icon-lg">' + (app.icon_filename ? '<img src="/uploads/icons/' + app.icon_filename + '" alt="' + app.name + '" />' : initials(app.name)) + '</div>' +
        '<h2>' + app.name + '</h2>' +
        '<span class="tag">' + app.category + '</span>' +
        '<p style="color:var(--text-dim); margin-top:12px;">' + (app.description || "No description provided.") + '</p>' +
        '<div class="meta" style="margin:14px 0;"><span>Version ' + app.version + '</span><span>' + fmtSize(app.size_bytes) + '</span><span>' + app.downloads + ' downloads</span></div>' +
        '<button class="download-btn" id="downloadBtn">Download APK</button>';
      modalOverlay.classList.remove("hidden");
      document.getElementById("downloadBtn").addEventListener("click", function() {
        window.location.href = "/download/" + app.id;
        setTimeout(loadApps, 1000);
      });
    }

    modalClose.addEventListener("click", function() { modalOverlay.classList.add("hidden"); });
    modalOverlay.addEventListener("click", function(e) { if (e.target === modalOverlay) modalOverlay.classList.add("hidden"); });
    searchInput.addEventListener("input", function() { clearTimeout(debounceTimer); debounceTimer = setTimeout(loadApps, 300); });
    categorySelect.addEventListener("change", loadApps);
    sortSelect.addEventListener("change", loadApps);

    loadCategories();
    loadApps();
  }

  if (document.getElementById("uploadForm")) {
    const form = document.getElementById("uploadForm");
    const apkDropzone = document.getElementById("apkDropzone");
    const apkInput = document.getElementById("apkInput");
    const apkLabel = document.getElementById("apkLabel");
    const iconDropzone = document.getElementById("iconDropzone");
    const iconInput = document.getElementById("iconInput");
    const iconLabel = document.getElementById("iconLabel");
    const progressWrap = document.getElementById("progressWrap");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    const statusMsg = document.getElementById("statusMsg");
    const submitBtn = document.getElementById("submitBtn");

    function setupDropzone(zone, input, label, isApk) {
      zone.addEventListener("click", function() { input.click(); });
      zone.addEventListener("dragover", function(e) { e.preventDefault(); zone.classList.add("dragover"); });
      zone.addEventListener("dragleave", function() { zone.classList.remove("dragover"); });
      zone.addEventListener("drop", function(e) {
        e.preventDefault();
        zone.classList.remove("dragover");
        if (e.dataTransfer.files.length) { input.files = e.dataTransfer.files; updateLabel(); }
      });
      input.addEventListener("change", updateLabel);
      function updateLabel() {
        if (input.files.length) {
          const f = input.files[0];
          label.textContent = f.name + " (" + fmtSize(f.size) + ")";
        } else {
          label.textContent = isApk ? "Click or drag your .apk file here" : "Click or drag an image here";
        }
      }
    }
    setupDropzone(apkDropzone, apkInput, apkLabel, true);
    setupDropzone(iconDropzone, iconInput, iconLabel, false);

    form.addEventListener("submit", function(e) {
      e.preventDefault();
      statusMsg.textContent = "";
      statusMsg.className = "status-msg";

      if (!apkInput.files.length) {
        statusMsg.textContent = "Please select an APK file.";
        statusMsg.className = "status-msg error";
        return;
      }

      const formData = new FormData(form);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");
      submitBtn.disabled = true;
      progressWrap.classList.remove("hidden");

      xhr.upload.addEventListener("progress", function(e) {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          progressBar.style.width = pct + "%";
          progressText.textContent = pct + "%";
        }
      });

      xhr.onload = function() {
        submitBtn.disabled = false;
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && res.success) {
            statusMsg.textContent = "Uploaded successfully!";
            statusMsg.className = "status-msg success";
            form.reset();
            apkLabel.textContent = "Click or drag your .apk file here";
            iconLabel.textContent = "Click or drag an image here";
            progressBar.style.width = "0%";
            progressText.textContent = "0%";
            setTimeout(function() { progressWrap.classList.add("hidden"); }, 1500);
          } else {
            statusMsg.textContent = "Error: " + (res.error || "Upload failed.");
            statusMsg.className = "status-msg error";
          }
        } catch (err) {
          statusMsg.textContent = "Unexpected server response.";
          statusMsg.className = "status-msg error";
        }
      };
      xhr.onerror = function() {
        submitBtn.disabled = false;
        statusMsg.textContent = "Network error during upload.";
        statusMsg.className = "status-msg error";
      };
      xhr.send(formData);
    });
  }
`;

// =========================================================
// EMBEDDED PAGES
// =========================================================
function browsePage() {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>App Store</title>
<style>${CSS}</style></head>
<body>
<header class="topbar">
  <div class="brand">📦 AppHub</div>
  <nav><a href="/" class="active">Browse</a><a href="/upload">Upload App</a></nav>
</header>
<main class="container">
  <section class="hero"><h1>Find your next app</h1><p>Browse, search, and download apps shared by the community.</p></section>
  <section class="controls">
    <input type="text" id="searchInput" placeholder="Search apps by name or description..." />
    <select id="categorySelect"><option value="All">All Categories</option></select>
    <select id="sortSelect">
      <option value="newest">Newest</option>
      <option value="popular">Most Downloaded</option>
      <option value="name">Name (A-Z)</option>
    </select>
  </section>
  <section id="appGrid" class="app-grid"><p class="loading">Loading apps...</p></section>
</main>
<div id="modalOverlay" class="modal-overlay hidden">
  <div class="modal"><button id="modalClose" class="modal-close">&times;</button><div id="modalContent"></div></div>
</div>
<script>${CLIENT_JS}</script>
</body></html>`;
}

function uploadPage() {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Upload App - AppHub</title>
<style>${CSS}</style></head>
<body>
<header class="topbar">
  <div class="brand">📦 AppHub</div>
  <nav><a href="/">Browse</a><a href="/upload" class="active">Upload App</a></nav>
</header>
<main class="container narrow">
  <section class="hero"><h1>Upload a new app</h1><p>Fill in the details below and drop your APK file.</p></section>
  <form id="uploadForm" class="upload-form">
    <label>App Name *<input type="text" name="name" required placeholder="e.g. My Cool App" /></label>
    <label>Description<textarea name="description" rows="4" placeholder="What does this app do?"></textarea></label>
    <div class="row">
      <label>Category<input type="text" name="category" placeholder="e.g. Tools, Games" /></label>
      <label>Version<input type="text" name="version" placeholder="e.g. 1.0.0" /></label>
    </div>
    <label>App Icon (optional)
      <div class="dropzone" id="iconDropzone">
        <span id="iconLabel">Click or drag an image here</span>
        <input type="file" name="icon" id="iconInput" accept=".png,.jpg,.jpeg,.webp" hidden />
      </div>
    </label>
    <label>APK File *
      <div class="dropzone" id="apkDropzone">
        <span id="apkLabel">Click or drag your .apk file here</span>
        <input type="file" name="apk" id="apkInput" accept=".apk" required hidden />
      </div>
    </label>
    <div id="progressWrap" class="progress-wrap hidden">
      <div id="progressBar" class="progress-bar"></div><span id="progressText">0%</span>
    </div>
    <button type="submit" id="submitBtn">Upload App</button>
    <p id="statusMsg" class="status-msg"></p>
  </form>
</main>
<script>${CLIENT_JS}</script>
</body></html>`;
}

function appDetailPage(app) {
  const safeName = app.name.replace(/</g, "&lt;");
  const safeDesc = (app.description || `Download ${app.name} APK for free.`).replace(/</g, "&lt;");
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${safeName} - Download APK | AppHub</title>
<meta name="description" content="${safeDesc}" />
<style>${CSS}</style></head>
<body>
<header class="topbar">
  <div class="brand">📦 AppHub</div>
  <nav><a href="/">Browse</a><a href="/upload">Upload App</a></nav>
</header>
<main class="container narrow">
  <div class="modal" style="margin-top:20px;">
    <div class="icon-lg">${app.icon_filename ? `<img src="/uploads/icons/${app.icon_filename}" alt="${safeName}" />` : app.name.trim().slice(0,2).toUpperCase()}</div>
    <h1>${safeName}</h1>
    <span class="tag">${app.category}</span>
    <p style="color:var(--text-dim); margin-top:12px;">${safeDesc}</p>
    <div class="meta" style="margin:14px 0;"><span>Version ${app.version}</span><span>${app.downloads} downloads</span></div>
    <a class="download-btn" href="/download/${app.id}" style="display:block;">Download APK</a>
  </div>
</main>
</body></html>`;
}

// ---------- Page routes ----------
app.get("/", (req, res) => res.send(browsePage()));
app.get("/upload", (req, res) => res.send(uploadPage()));

// SEO-friendly individual page per app (server-rendered so Google can read it directly)
app.get("/app/:id", (req, res) => {
  const app_ = db.prepare("SELECT * FROM apps WHERE id = ?").get(req.params.id);
  if (!app_) return res.status(404).send("App not found");
  res.send(appDetailPage(app_));
});

// Sitemap so Google knows every app page that exists
app.get("/sitemap.xml", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const apps = db.prepare("SELECT id, uploaded_at FROM apps").all();
  const urls = [
    `<url><loc>${baseUrl}/</loc></url>`,
    `<url><loc>${baseUrl}/upload</loc></url>`,
    ...apps.map(a => `<url><loc>${baseUrl}/app/${a.id}</loc></url>`)
  ].join("\n");
  res.set("Content-Type", "application/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
});

// robots.txt pointing search engines to the sitemap
app.get("/robots.txt", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.type("text/plain").send(`User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml`);
});

// ---------- API routes ----------
app.post("/api/upload", upload.fields([{ name: "apk", maxCount: 1 }, { name: "icon", maxCount: 1 }]), (req, res) => {
  try {
    const { name, description, category, version } = req.body;
    const apkFile = req.files?.apk?.[0];
    const iconFile = req.files?.icon?.[0];
    if (!name || !apkFile) return res.status(400).json({ error: "Name and APK file are required." });

    const stmt = db.prepare(`INSERT INTO apps (name, description, category, version, filename, icon_filename, size_bytes) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const info = stmt.run(name, description || "", category || "Uncategorized", version || "1.0", apkFile.filename, iconFile ? iconFile.filename : null, apkFile.size);
    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Upload failed." });
  }
});

app.get("/api/apps", (req, res) => {
  const { q, category, sort } = req.query;
  let query = "SELECT * FROM apps WHERE 1=1";
  const params = [];
  if (q) { query += " AND (name LIKE ? OR description LIKE ?)"; params.push(`%${q}%`, `%${q}%`); }
  if (category && category !== "All") { query += " AND category = ?"; params.push(category); }
  if (sort === "popular") query += " ORDER BY downloads DESC";
  else if (sort === "name") query += " ORDER BY name ASC";
  else query += " ORDER BY uploaded_at DESC";
  res.json(db.prepare(query).all(...params));
});

app.get("/api/categories", (req, res) => {
  const rows = db.prepare("SELECT DISTINCT category FROM apps").all();
  res.json(rows.map(r => r.category));
});

app.get("/download/:id", (req, res) => {
  const app_ = db.prepare("SELECT * FROM apps WHERE id = ?").get(req.params.id);
  if (!app_) return res.status(404).send("App not found");
  const filePath = path.join(UPLOAD_DIR, app_.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send("File missing on server");
  db.prepare("UPDATE apps SET downloads = downloads + 1 WHERE id = ?").run(req.params.id);
  res.download(filePath, `${app_.name.replace(/\s+/g, "_")}.apk`);
});

app.use("/uploads/icons", express.static(ICON_DIR));

app.delete("/api/apps/:id", (req, res) => {
  const app_ = db.prepare("SELECT * FROM apps WHERE id = ?").get(req.params.id);
  if (!app_) return res.status(404).json({ error: "Not found" });
  const filePath = path.join(UPLOAD_DIR, app_.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  if (app_.icon_filename) {
    const iconPath = path.join(ICON_DIR, app_.icon_filename);
    if (fs.existsSync(iconPath)) fs.unlinkSync(iconPath);
  }
  db.prepare("DELETE FROM apps WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
