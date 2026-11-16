CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT,
  fullname TEXT,
  email TEXT
);

-- Data Demo (Admin & User)
INSERT INTO users (username, password, role, fullname, email) VALUES 
('admin1', 'admin123', 'admin', 'Administrator Utama', 'admin@ipwija.ac.id'),
('user1', 'user123', 'user', 'Mahasiswa Demo', 'mhs@informatika.ac.id');