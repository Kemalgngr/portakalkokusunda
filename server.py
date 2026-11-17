import argparse
import getpass
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB = Path(os.environ.get('MENU_DB', ROOT / 'data/menu.sqlite3'))
SESSIONS = {}
ATTEMPTS = {}
CATEGORIES = ['Kahvaltı', 'Sıkma & Gözleme', 'Günün Menüsü', 'İçecekler']
SEED = [
    ('Serpme Kahvaltı', 'Yöresel peynirler, zeytin, ev reçelleri, bal, tereyağı, yumurta ve sıcacık lezzetler. İki kişilik.', 850, 'Kahvaltı', 'SOFRANIN YILDIZI'),
    ('Menemen', 'Domates, biber ve yumurtanın tavada sıcacık buluşması.', 180, 'Kahvaltı', ''),
    ('Peynirli Sıkma', 'İncecik açılan hamur, yöresel peynir ve maydanoz.', 85, 'Sıkma & Gözleme', 'YÖRESEL'),
    ('Patatesli Gözleme', 'Sac üzerinde pişen, el açması ve bol içli.', 140, 'Sıkma & Gözleme', ''),
    ('Ev Böreği', 'Çıtır çıtır, fırından yeni çıkmış peynirli börek.', 120, 'Sıkma & Gözleme', ''),
    ('Kuru Fasulye & Pilav', 'Yanında turşu ve ayran ile ev yapımı öğle sofrası.', 250, 'Günün Menüsü', 'GÜNÜN FIX MENÜSÜ'),
    ('Demleme Çay', 'Odun ateşinde sobada demlenmiş çay.', 20, 'İçecekler', ''),
    ('Türk Kahvesi', 'Sohbetin en güzel eşlikçisi.', 80, 'İçecekler', ''),
    ('Taze Portakal Suyu', 'Portakalın en ferah hali. Mevsiminde.', 100, 'İçecekler', ''),
]

def connect():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    return con

def init():
    DB.parent.mkdir(parents=True, exist_ok=True)
    with connect() as con:
        con.execute('CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT, description TEXT, price REAL, category TEXT, badge TEXT, available INTEGER DEFAULT 1)')
        con.execute('CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY CHECK(id=1), salt TEXT, digest TEXT)')
        if not con.execute('SELECT 1 FROM products').fetchone():
            con.executemany('INSERT INTO products(name,description,price,category,badge) VALUES (?,?,?,?,?)', SEED)

def password_hash(password, salt):
    return hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'public'), **kwargs)

    def log_message(self, fmt, *args):
        # Never log request bodies or credentials.
        pass

    def reply(self, status, obj, cookie=None):
        data = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(data)))
        if cookie:
            self.send_header('Set-Cookie', cookie)
        self.end_headers()
        self.wfile.write(data)

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        super().end_headers()

    def token(self):
        cookie = SimpleCookie()
        try:
            cookie.load(self.headers.get('Cookie', ''))
            return cookie['session'].value if 'session' in cookie else ''
        except Exception:
            return ''

    def authorized(self):
        return SESSIONS.get(self.token(), 0) > time.time()

    def do_GET(self):
        if self.path == '/api/menu':
            with connect() as con:
                rows = con.execute('SELECT * FROM products ORDER BY id').fetchall()
            return self.reply(200, {'products': [dict(r) for r in rows if r['available'] or self.authorized()], 'categories': CATEGORIES})
        if self.path == '/api/session':
            return self.reply(200, {'authenticated': self.authorized()})
        if self.path in ('/admin', '/admin/'):
            self.path = '/admin.html'
        # Serve only the explicitly public assets, never databases or source files.
        if self.path.split('?')[0] not in ('/', '/index.html', '/admin.html', '/style.css', '/app.js', '/admin.js', '/orange.svg', '/orange-garden.svg', '/config.js', '/backend.js'):
            return self.reply(404, {'error': 'Bulunamadı'})
        super().do_GET()

    def do_POST(self):
        # Require a same-origin JSON request. Cross-site forms cannot mutate data.
        origin = self.headers.get('Origin')
        if origin and origin != f"{'https' if os.environ.get('COOKIE_SECURE') == '1' else 'http'}://{self.headers.get('Host')}":
            return self.reply(403, {'error': 'Geçersiz kaynak'})
        if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            return self.reply(415, {'error': 'JSON gerekli'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 16384:
                raise ValueError()
            body = json.loads(self.rfile.read(length))
            if not isinstance(body, dict):
                raise ValueError()
        except (ValueError, json.JSONDecodeError):
            return self.reply(400, {'error': 'Geçersiz istek'})
        if self.path == '/api/login':
            ip = self.client_address[0]
            attempts = [t for t in ATTEMPTS.get(ip, []) if t > time.time() - 300]
            if len(attempts) >= 5:
                return self.reply(429, {'error': 'Çok fazla deneme. 5 dakika sonra tekrar deneyin.'})
            ATTEMPTS[ip] = attempts + [time.time()]
            with connect() as con:
                admin = con.execute('SELECT * FROM admin WHERE id=1').fetchone()
            password = body.get('password', '')
            if not admin:
                return self.reply(503, {'error': 'Yönetici hesabı henüz kurulmadı. Sunucuda --set-password çalıştırın.'})
            if not isinstance(password, str) or len(password) > 256 or not hmac.compare_digest(password_hash(password, admin['salt']), admin['digest']):
                return self.reply(401, {'error': 'Şifre yanlış'})
            ATTEMPTS.pop(ip, None)
            token = secrets.token_urlsafe(32)
            SESSIONS[token] = time.time() + 28800
            secure = '; Secure' if os.environ.get('COOKIE_SECURE') == '1' else ''
            return self.reply(200, {'ok': True}, f'session={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800{secure}')
        if not self.authorized():
            return self.reply(401, {'error': 'Yönetici girişi gerekli'})
        if self.path == '/api/logout':
            SESSIONS.pop(self.token(), None)
            return self.reply(200, {'ok': True}, 'session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')
        if self.path == '/api/products/delete':
            with connect() as con:
                con.execute('DELETE FROM products WHERE id=?', (body.get('id'),))
            return self.reply(200, {'ok': True})
        if self.path != '/api/products':
            return self.reply(404, {'error': 'Bulunamadı'})
        try:
            name = body['name'].strip()
            description = body.get('description', '').strip()
            category = body['category']
            price = float(body['price'])
            badge = body.get('badge', '').strip()
            if not name or len(name) > 100 or len(description) > 1000 or len(badge) > 80 or category not in CATEGORIES or not 0 <= price <= 100000:
                raise ValueError()
            values = (name, description, price, category, badge, int(bool(body.get('available', True))))
            with connect() as con:
                if body.get('id'):
                    con.execute('UPDATE products SET name=?,description=?,price=?,category=?,badge=?,available=? WHERE id=?', values + (int(body['id']),))
                else:
                    con.execute('INSERT INTO products(name,description,price,category,badge,available) VALUES(?,?,?,?,?,?)', values)
            return self.reply(200, {'ok': True})
        except (KeyError, ValueError, TypeError, OverflowError):
            return self.reply(400, {'error': 'Ürün bilgilerini ve fiyatı kontrol edin.'})

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=3000)
    parser.add_argument('--set-password', action='store_true')
    args = parser.parse_args()
    init()
    if args.set_password:
        password = getpass.getpass('Yeni yönetici şifresi (en az 12 karakter): ')
        if len(password) < 12 or password != getpass.getpass('Şifreyi tekrar girin: '):
            raise SystemExit('Şifreler eşleşmeli ve en az 12 karakter olmalı.')
        salt = secrets.token_hex(16)
        with connect() as con:
            con.execute('INSERT OR REPLACE INTO admin VALUES(1,?,?)', (salt, password_hash(password, salt)))
        print('Yönetici şifresi kaydedildi. Çalışan sunucuyu yeniden başlatın.')
    else:
        print(f'Menü sunucusu 0.0.0.0:{args.port}', flush=True)
        ThreadingHTTPServer(('0.0.0.0', args.port), Handler).serve_forever()
