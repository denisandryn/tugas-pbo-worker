// --- KONSEP PEWARISAN (INHERITANCE) DALAM PBO ---

class UserAccount {
  constructor(username, role, fullname, email) {
    this.username = username;
    this.role = role;
    this.fullname = fullname;
    this.email = email;
  }

  getDashboardFeatures() {
    return ["Lihat Profile", "Edit Profile"];
  }
}

class AdminAccount extends UserAccount {
  constructor(username, fullname, email) {
    super(username, "admin", fullname, email);
  }

  getDashboardFeatures() {
    return [...super.getDashboardFeatures(), "CRUD Semua User", "Akses Log Sistem & Konfigurasi"];
  }
}

class RegularUserAccount extends UserAccount {
  constructor(username, fullname, email) {
    super(username, "user", fullname, email);
  }

  getDashboardFeatures() {
    return [...super.getDashboardFeatures(), "Lihat Data Akademik Sendiri"];
  }
}

function createUserObject(row) {
  if (row.role === 'admin') {
    return new AdminAccount(row.username, row.fullname, row.email);
  } else {
    return new RegularUserAccount(row.username, row.fullname, row.email);
  }
}

// Template Layout Dasar dengan Tailwind CSS agar GUI Bagus
function layoutHTML(title, content) {
  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <!-- Tailwind CSS untuk Desain GUI Modern -->
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 min-h-screen text-slate-100 flex items-center justify-center p-4">
      <div class="w-full max-w-2xl bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-8">
        ${content}
      </div>
    </body>
    </html>
  `;
}

// --- CLOUDFLARE WORKER ROUTING & 3 FORM ---

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle Form 1: LOGIN
    if (path === "/" || path === "/login") {
      if (request.method === "POST") {
        const formData = await request.formData();
        const username = formData.get("username");
        const password = formData.get("password");

        const userRow = await env.DB.prepare(
          "SELECT * FROM users WHERE username = ? AND password = ?"
        ).bind(username, password).first();

        if (userRow) {
          const userObj = createUserObject(userRow);
          return Response.redirect(`${url.origin}/profile?username=${userObj.username}`, 303);
        } else {
          return new Response(layoutHTML("Login Gagal", `
            <div class="text-center py-6">
              <div class="text-red-400 text-5xl mb-4">⚠️</div>
              <h2 class="text-2xl font-bold text-red-400 mb-2">Login Gagal!</h2>
              <p class="text-slate-300 mb-6">Username atau Password yang Anda masukkan salah.</p>
              <a href="/" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition shadow-lg shadow-indigo-500/30">Coba Lagi</a>
            </div>
          `), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
        }
      }

      return new Response(layoutHTML("Form Login - PBO App", `
        <div class="text-center mb-8">
          <span class="bg-indigo-500/20 text-indigo-400 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">Tugas PBO / DOP</span>
          <h2 class="text-3xl font-extrabold mt-3 tracking-tight">Selamat Datang 👋</h2>
          <p class="text-slate-400 text-sm mt-1">Silakan masuk untuk menguji sistem berbasis Inheritance</p>
        </div>

        <form method="POST" action="/login" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
            <input type="text" name="username" required placeholder="cth: admin1" class="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <input type="password" name="password" required placeholder="••••••••" class="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition" />
          </div>
          <button type="submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-lg shadow-lg shadow-indigo-600/30 transition">Masuk ke Aplikasi</button>
        </form>

        <div class="mt-8 pt-6 border-t border-slate-700/60">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">💡 Akun Demo untuk Dicoba:</p>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="bg-slate-900/40 border border-slate-700/60 p-3 rounded-lg">
              <span class="text-indigo-400 font-bold block mb-1">Admin Role</span>
              <p class="text-slate-300">User: <code class="text-amber-300">admin1</code></p>
              <p class="text-slate-300">Pass: <code class="text-amber-300">admin123</code></p>
            </div>
            <div class="bg-slate-900/40 border border-slate-700/60 p-3 rounded-lg">
              <span class="text-emerald-400 font-bold block mb-1">User Role</span>
              <p class="text-slate-300">User: <code class="text-amber-300">user1</code></p>
              <p class="text-slate-300">Pass: <code class="text-amber-300">user123</code></p>
            </div>
          </div>
          <div class="mt-5 text-center">
            <a href="/users" class="text-indigo-400 hover:text-indigo-300 text-sm font-medium underline underline-offset-4">Lihat Tabel User & Manajemen Data (Form 3) &rarr;</a>
          </div>
        </div>
      `), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    // Handle Form 2: PROFILE
    if (path === "/profile") {
      const username = url.searchParams.get("username") || "admin1";
      const userRow = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
      
      if (!userRow) return new Response("User tidak ditemukan. <a href='/'>Login</a>");

      const userObj = createUserObject(userRow);
      const features = userObj.getDashboardFeatures();
      const badgeColor = userObj.role === 'admin' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

      return new Response(layoutHTML("Form Profile - PBO App", `
        <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
          <div>
            <span class="text-xs uppercase tracking-wider text-slate-400 font-semibold">Form 2: Profile</span>
            <h2 class="text-2xl font-bold mt-1">Dashboard Pengguna</h2>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide ${badgeColor}">${userObj.role}</span>
        </div>

        <div class="space-y-4 bg-slate-900/50 p-5 rounded-xl border border-slate-700/70 mb-6">
          <div class="grid grid-cols-3 gap-2 text-sm">
            <span class="text-slate-400 font-medium">Username</span>
            <span class="col-span-2 text-slate-100 font-semibold">: @${userObj.username}</span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-sm">
            <span class="text-slate-400 font-medium">Nama Lengkap</span>
            <span class="col-span-2 text-slate-100 font-semibold">: ${userObj.fullname}</span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-sm">
            <span class="text-slate-400 font-medium">Email</span>
            <span class="col-span-2 text-slate-100 font-semibold">: ${userObj.email}</span>
          </div>
        </div>

        <div class="mb-8">
          <h3 class="text-sm font-semibold uppercase tracking-wider text-indigo-400 mb-3">Hak Akses Fitur (Hasil Pewarisan Class PBO):</h3>
          <ul class="space-y-2">
            ${features.map(f => `
              <li class="flex items-center text-sm bg-slate-900/30 border border-slate-700/50 px-4 py-2.5 rounded-lg text-slate-200">
                <span class="text-emerald-400 mr-2 font-bold">✔</span> ${f}
              </li>
            `).join("")}
          </ul>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-slate-700 text-sm">
          <a href="/" class="text-slate-400 hover:text-slate-200 transition">&larr; Logout / Ganti Akun</a>
          <a href="/users" class="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg font-medium text-white transition">Kelola Tabel User &rarr;</a>
        </div>
      `), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    // Handle Form 3: TABLE USER (CRUD Sederhana)
    if (path === "/users") {
      if (request.method === "POST") {
        const formData = await request.formData();
        const u = formData.get("username");
        const p = formData.get("password");
        const r = formData.get("role");
        const f = formData.get("fullname");
        const e = formData.get("email");

        if (u && p) {
          try {
            await env.DB.prepare("INSERT INTO users (username, password, role, fullname, email) VALUES (?, ?, ?, ?, ?)").bind(u, p, r, f, e).run();
          } catch (err) {
            // Tangkap error jika username duplikat
          }
        }
        return Response.redirect(`${url.origin}/users`, 303);
      }

      const { results } = await env.DB.prepare("SELECT * FROM users").all();

      return new Response(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Form Table User - PBO App</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 min-h-screen text-slate-100 p-6 md:p-10">
          <div class="max-w-5xl mx-auto bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-6 md:p-8">
            <div class="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-700 mb-6 gap-4">
              <div>
                <span class="text-xs uppercase tracking-wider text-indigo-400 font-semibold">Form 3: Table User</span>
                <h2 class="text-2xl font-bold mt-1">Data Storage Lokal (D1 SQLite)</h2>
              </div>
              <a href="/" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition self-start md:self-auto">&larr; Kembali ke Login</a>
            </div>

            <!-- Tabel Data User -->
            <div class="overflow-x-auto rounded-xl border border-slate-700 mb-8">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-900/80 text-slate-300 text-xs uppercase tracking-wider border-b border-slate-700">
                    <th class="p-3.5">ID</th>
                    <th class="p-3.5">Username</th>
                    <th class="p-3.5">Role</th>
                    <th class="p-3.5">Nama Lengkap</th>
                    <th class="p-3.5">Email</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-700/60 text-sm">
                  ${results.map(row => `
                    <tr class="hover:bg-slate-700/30 transition">
                      <td class="p-3.5 font-mono text-slate-400">${row.id}</td>
                      <td class="p-3.5 font-semibold text-slate-200">@${row.username}</td>
                      <td class="p-3.5">
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${row.role === 'admin' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}">
                          ${row.role}
                        </span>
                      </td>
                      <td class="p-3.5 text-slate-300">${row.fullname}</td>
                      <td class="p-3.5 text-slate-400">${row.email}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>

            <!-- Form Tambah User (CRUD Sederhana) -->
            <div class="bg-slate-900/60 border border-slate-700/80 p-5 md:p-6 rounded-xl">
              <h3 class="text-base font-bold text-slate-200 mb-4 flex items-center">
                <span class="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span> Tambah Data User Baru (CRUD)
              </h3>
              <form method="POST" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <input type="text" name="username" placeholder="Username unik" required class="bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
                <input type="password" name="password" placeholder="Password" required class="bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
                <select name="role" class="bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="user">Role: User</option>
                  <option value="admin">Role: Admin</option>
                </select>
                <input type="text" name="fullname" placeholder="Nama Lengkap" required class="bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
                <input type="email" name="email" placeholder="Email aktif" required class="bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
                <button type="submit" class="bg-emerald-600 hover:bg-emerald-500 font-semibold rounded-lg px-4 py-2.5 text-sm text-white shadow-lg shadow-emerald-600/30 transition">Simpan Data</button>
              </form>
            </div>
          </div>
        </body>
        </html>
      `, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    return new Response("Not Found", { status: 404 });
  },
};
