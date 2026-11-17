import http.cookiejar
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server

class MenuTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        server.DB = Path(self.temp.name) / 'menu.sqlite3'
        server.init()
        salt = '01' * 16
        with server.connect() as con:
            con.execute('INSERT INTO admin VALUES(1,?,?)', (salt, server.password_hash('test-password-only', salt)))
        server.SESSIONS.clear()
        server.ATTEMPTS.clear()
        self.http = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        self.thread = threading.Thread(target=self.http.serve_forever, daemon=True)
        self.thread.start()
        self.base = f'http://127.0.0.1:{self.http.server_port}'
        self.client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def tearDown(self):
        self.http.shutdown()
        self.http.server_close()
        self.thread.join()
        self.temp.cleanup()

    def request(self, path, data=None, client=None, origin=None):
        headers = {'Content-Type': 'application/json'}
        if origin:
            headers['Origin'] = origin
        req = urllib.request.Request(self.base + path, data=None if data is None else json.dumps(data).encode(), headers=headers)
        try:
            r = (client or self.client).open(req)
        except urllib.error.HTTPError as e:
            r = e
        return r.status, json.loads(r.read())

    def test_admin_and_public_workflow(self):
        public = urllib.request.build_opener()
        self.assertEqual(self.request('/api/products', {}, public)[0], 401)
        self.assertEqual(self.request('/api/login', {'password': 'wrong'})[0], 401)
        self.assertEqual(self.request('/api/login', {'password': 'test-password-only'})[0], 200)
        self.assertTrue(self.request('/api/session')[1]['authenticated'])
        product = {'name': 'Deneme Gözleme', 'description': 'Taze', 'price': 175, 'category': 'Sıkma & Gözleme', 'available': True}
        self.assertEqual(self.request('/api/products', product, origin='https://evil.example')[0], 403)
        self.assertEqual(self.request('/api/products', product)[0], 200)
        rows = self.request('/api/menu', client=public)[1]['products']
        p = next(p for p in rows if p['name'] == product['name'])
        self.assertEqual(p['price'], 175)
        product.update(id=p['id'], price=190, available=False)
        self.assertEqual(self.request('/api/products', product)[0], 200)
        self.assertFalse(any(x['id'] == p['id'] for x in self.request('/api/menu', client=public)[1]['products']))
        with server.connect() as con:
            self.assertEqual(con.execute('SELECT price FROM products WHERE id=?', (p['id'],)).fetchone()[0], 190)
        self.assertTrue(any(x['id'] == p['id'] for x in self.request('/api/menu')[1]['products']))
        self.assertEqual(self.request('/api/products', dict(product, price=-1))[0], 400)
        self.assertEqual(self.request('/api/products/delete', {'id': p['id']})[0], 200)
        self.assertEqual(self.request('/api/logout', {})[0], 200)
        self.assertEqual(self.request('/api/products', product)[0], 401)

    def test_rate_limit_and_private_files(self):
        for _ in range(5):
            self.assertEqual(self.request('/api/login', {'password': 'wrong'})[0], 401)
        self.assertEqual(self.request('/api/login', {'password': 'wrong'})[0], 429)
        self.assertEqual(self.request('/server.py')[0], 404)
        self.assertEqual(self.request('/data/menu.sqlite3')[0], 404)

if __name__ == '__main__':
    unittest.main()
