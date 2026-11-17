export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Inisialisasi Otomatis Tabel Database D1
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE,
          password TEXT,
          role TEXT,
          fullname TEXT,
          email TEXT
        )
      `).run();
    } catch (e) {}

    // ==========================================
    // KONSEP PBO & PEWARISAN (INHERITANCE)
    // ==========================================
    class UserAccount {
      constructor(username, role, fullname, email) {
        this.username = username;
        this.role = role;
        this.fullname = fullname;
        this.email = email;
      }
      getFeatures() {
        return ["Lihat Profile", "Edit Profile Sendiri"];
      }
    }

    class AdminAccount extends UserAccount {
      constructor(username, fullname, email) {
        super(username, 'admin', fullname, email);
      }
      getFeatures() {
        return [...super.getFeatures(), "CRUD (Tambah, Edit, & Hapus Semua User)", "Akses Sistem Penuh"];
      }
    }

    class RegularUserAccount extends UserAccount {
      constructor(username, fullname, email) {
        super(username, 'user', fullname, email);
      }
      getFeatures() {
        return [...super.getFeatures(), "Lihat Data Sendiri"];
      }
    }

    // Seed Data Demo Otomatis Jika Tabel Kosong
    const checkUser = await env.DB.prepare("SELECT COUNT(*) as total FROM users").first();
    if (!checkUser || checkUser.total === 0) {
      await env.DB.prepare("INSERT OR IGNORE INTO users (username, password, role, fullname, email) VALUES ('admin1', 'admin123', 'admin', 'Administrator Utama', 'admin@kampus.ac.id')").run();
      await env.DB.prepare("INSERT OR IGNORE INTO users (username, password, role, fullname, email) VALUES ('user1', 'user123', 'user', 'Mahasiswa Demo', 'mhs@kampus.ac.id')").run();
    }

    // ==========================================
    // FORM 1: HALAMAN LOGIN
    // ==========================================
    if (path === "/" || path === "/login") {
      if (request.method === "POST") {
        const formData = await request.formData();
        const username = formData.get("username");
        const password = formData.get("password");

        const userRow = await env.DB.prepare(
          "SELECT * FROM users WHERE username = ? AND password = ?"
        ).bind(username, password).first();

        if (userRow) {
          return Response.redirect(`${url.origin}/profile?username=${userRow.username}`, 303);
        } else {
          return new Response(`
            <!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Login Gagal</title><script src="https://cdn.tailwindcss.com"></script></head>
            <body class="bg-slate-900 min-h-screen text-slate-100 flex items-center justify-center p-4">
              <div class="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center max-w-md w-full shadow-2xl">
                <h2 class="text-2xl font-bold text-red-400 mb-2">Login Gagal!</h2>
                <p class="text-slate-300 mb-6">Username atau Password salah.</p>
                <a href="/" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-medium">Coba Lagi</a>
              </div>
            </body></html>
          `, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
        }
      }

      return new Response(`
        <!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Form 1: Login - PBO App</title><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 min-h-screen text-slate-100 flex items-center justify-center p-4">
          <div class="w-full max-w-lg bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-8">
            <div class="text-center mb-6">
              <span class="bg-indigo-500/20 text-indigo-400 text-xs font-semibold px-3 py-1 rounded-full uppercase">Tugas PBO / DOP</span>
              <h2 class="text-3xl font-extrabold mt-3">Form 1: Login Akun</h2>
              <p class="text-slate-400 text-sm mt-1">Cloudflare Worker + D1 Database</p>
            </div>
            <form method="POST" action="/login" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">Username</label>
                <input type="text" name="username" required placeholder="cth: admin1 atau user1" class="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">Password</label>
                <input type="password" name="password" required placeholder="••••••••" class="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500" />
              </div>
              <button type="submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-lg shadow-lg shadow-indigo-600/30 transition text-white">Masuk Sistem</button>
            </form>
            <div class="mt-6 pt-6 border-t border-slate-700 text-sm text-center">
              <p class="text-slate-400 mb-2">Akun Demo:</p>
              <p class="text-slate-300">Admin: <code class="text-amber-300">admin1 / admin123</code></p>
              <p class="text-slate-300">User: <code class="text-amber-300">user1 / user123</code></p>
            </div>
          </div>
        </body></html>
      `, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    // ==========================================
    // FORM 2: PROFILE / DASHBOARD (PBO INHERITANCE)
    // ==========================================
    if (path === "/profile") {
      const username = url.searchParams.get("username") || "admin1";
      const userRow = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
      
      if (!userRow) return new Response("User tidak ditemukan. <a href='/'>Kembali ke Login</a>");

      let accountObj = userRow.role === 'admin' 
        ? new AdminAccount(userRow.username, userRow.fullname, userRow.email) 
        : new RegularUserAccount(userRow.username, userRow.fullname, userRow.email);

      const badgeColor = userRow.role === 'admin' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      const featuresHTML = accountObj.getFeatures().map(f => `<li class="bg-slate-900/40 border border-slate-700/50 p-2.5 rounded-lg text-sm">✔ ${f}</li>`).join('');

      return new Response(`
        <!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Form 2: Profile - PBO App</title><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 min-h-screen text-slate-100 flex items-center justify-center p-4">
          <div class="w-full max-w-lg bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-8">
            <div class="flex items-center justify-between pb-4 border-b border-slate-700 mb-6">
              <div>
                <span class="text-xs uppercase tracking-wider text-slate-400 font-semibold">Form 2: Profile Dashboard</span>
                <h2 class="text-2xl font-bold mt-1">Halo, ${accountObj.fullname}</h2>
              </div>
              <span class="px-3 py-1 rounded-full text-xs font-bold border uppercase ${badgeColor}">${accountObj.role}</span>
            </div>
            <div class="space-y-3 bg-slate-900/50 p-5 rounded-xl border border-slate-700 mb-6 text-sm">
              <p><span class="text-slate-400">Username:</span> <b class="text-slate-100">@${accountObj.username}</b></p>
              <p><span class="text-slate-400">Email:</span> <b class="text-slate-100">${accountObj.email}</b></p>
            </div>
            <div class="mb-6">
              <h3 class="text-sm font-semibold uppercase text-indigo-400 mb-3">Hak Akses Pewarisan Class PBO:</h3>
              <ul class="space-y-2">${featuresHTML}</ul>
            </div>
            <div class="flex justify-between pt-4 border-t border-slate-700 text-sm">
              <a href="/" class="text-slate-400 hover:text-white">&larr; Logout</a>
              <a href="/users?user=${userRow.username}" class="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg font-medium text-white">Kelola Tabel & CRUD User &rarr;</a>
            </div>
          </div>
        </body></html>
      `, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    // ==========================================
    // FORM 3: TABLE USER, TAMBAH & EDIT (CRUD)
    // ==========================================
    if (path === "/users") {
      const currentUser = url.searchParams.get("user") || "admin1";
      const editId = url.searchParams.get("edit");

      if (request.method === "POST") {
        const formData = await request.formData();
        const action = formData.get("action");

        if (action === "add") {
          const u = formData.get("username");
          const p = formData.get("password");
          const r = formData.get("role");
          const f = formData.get("fullname");
          const e = formData.get("email");
          if (u && p) {
            try {
              await env.DB.prepare("INSERT INTO users (username, password, role, fullname, email) VALUES (?, ?, ?, ?, ?)").bind(u, p, r, f, e).run();
            } catch (err) {}
          }
        } else if (action === "update") {
          const id = formData.get("id");
          const r = formData.get("role");
          const f = formData.get("fullname");
          const e = formData.get("email");
          if (id) {
            await env.DB.prepare("UPDATE users SET role = ?, fullname = ?, email = ? WHERE id = ?").bind(r, f, e, id).run();
          }
        } else if (action === "delete") {
          const id = formData.get("id");
          if (id) {
            await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
          }
        }
        return Response.redirect(`${url.origin}/users?user=${currentUser}`, 303);
      }

      const { results } = await env.DB.prepare("SELECT * FROM users").all();
      let editData = null;
      if (editId) {
        editData = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(editId).first();
      }

      return new Response(`
        <!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Form 3: CRUD User - PBO App</title><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 min-h-screen text-slate-100 p-6 md:p-10">
          <div class="max-w-4xl mx-auto bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-6 md:p-8">
            <div class="flex justify-between items-center pb-4 border-b border-slate-700 mb-6">
              <div>
                <span class="text-xs uppercase text-indigo-400 font-semibold">Form 3: Table User & CRUD</span>
                <h2 class="text-2xl font-bold mt-1">Manajemen Database D1 (SQLite)</h2>
              </div>
              <a href="/profile?username=${currentUser}" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">&larr; Kembali ke Profile</a>
            </div>
            
            <div class="overflow-x-auto rounded-xl border border-slate-700 mb-6">
              <table class="w-full text-left border-collapse text-sm">
                <thead>
                  <tr class="bg-slate-900/80 text-slate-300 uppercase text-xs border-b border-slate-700">
                    <th class="p-3">ID</th><th class="p-3">Username</th><th class="p-3">Role</th><th class="p-3">Nama Lengkap</th><th class="p-3">Email</th><th class="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-700">
                  ${results.map(row => `
                    <tr class="hover:bg-slate-700/30">
                      <td class="p-3 text-slate-400">${row.id}</td>
                      <td class="p-3 font-semibold">@${row.username}</td>
                      <td class="p-3"><span class="px-2 py-0.5 rounded-full text-xs font-bold uppercase ${row.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}">${row.role}</span></td>
                      <td class="p-3">${row.fullname}</td>
                      <td class="p-3 text-slate-400">${row.email}</td>
                      <td class="p-3 text-center space-x-2">
                        <a href="/users?user=${currentUser}&edit=${row.id}" class="px-2.5 py-1 bg-amber-600/80 hover:bg-amber-500 text-white text-xs rounded-md">Edit</a>
                        <form method="POST" style="display:inline;">
                          <input type="hidden" name="action" value="delete">
                          <input type="hidden" name="id" value="${row.id}">
                          <button type="submit" class="px-2.5 py-1 bg-red-600/80 hover:bg-red-500 text-white text-xs rounded-md" onclick="return confirm('Yakin ingin hapus?')">Hapus</button>
                        </form>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>

            <!-- FORM TAMBAH ATAU EDIT USER -->
            <div class="bg-slate-900/60 border border-slate-700 p-5 rounded-xl">
              <h3 class="text-base font-bold mb-3 text-slate-200">${editData ? 'Edit Data User (ID: ' + editData.id + ')' : 'Tambah Data User Baru'}</h3>
              <form method="POST" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <input type="hidden" name="action" value="${editData ? 'update' : 'add'}">
                ${editData ? `<input type="hidden" name="id" value="${editData.id}">` : ''}
                
                ${editData ? `
                  <input type="text" value="@${editData.username}" disabled class="bg-slate-800/50 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-400 cursor-not-allowed" />
                ` : `
                  <input type="text" name="username" placeholder="Username" required class="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm" />
                  <input type="password" name="password" placeholder="Password" required class="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm" />
                `}

                <select name="role" class="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm">
                  <option value="user" ${editData && editData.role === 'user' ? 'selected' : ''}>User</option>
                  <option value="admin" ${editData && editData.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
                <input type="text" name="fullname" value="${editData ? editData.fullname : ''}" placeholder="Nama Lengkap" required class="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm" />
                <input type="email" name="email" value="${editData ? editData.email : ''}" placeholder="Email" required class="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm" />
                
                <div class="flex gap-2">
                  <button type="submit" class="flex-1 bg-emerald-600 hover:bg-emerald-500 font-semibold py-2.5 rounded-lg text-sm text-white">${editData ? 'Update Data' : 'Simpan Data'}</button>
                  ${editData ? `<a href="/users?user=${currentUser}" class="bg-slate-700 hover:bg-slate-600 px-4 py-2.5 rounded-lg text-sm text-center flex items-center justify-center">Batal</a>` : ''}
                </div>
              </form>
            </div>
          </div>
        </body></html>
      `, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    return new Response("Not Found", { status: 404 });
  },
};