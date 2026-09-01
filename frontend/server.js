const http = require('http');
const fs = require('fs');
const path = require('path');
const root = '/app';
const routes = {'/':'index.html','/login':'auth.html','/signup':'auth.html','/auth':'auth.html','/assessment':'assessment.html','/discovery-assessment':'assessment.html','/recommendations':'recommendations.html','/dashboard':'dashboard.html','/learning':'learning.html','/learning-hub':'learning.html','/learning-concept':'learning-concept.html','/journey':'journey.html','/explorer':'explorer.html','/explorer-hub':'explorer.html','/summary':'summary.html','/profile':'profile.html'};
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
http.createServer((req,res) => {
  if (req.url.startsWith('/api/')) {
    const proxy = http.request({
      hostname: '127.0.0.1',
      port: 8001,
      path: req.url,
      method: req.method,
      headers: req.headers
    }, (proxyResponse) => {
      res.writeHead(proxyResponse.statusCode, proxyResponse.headers);
      proxyResponse.pipe(res);
    });
    proxy.on('error', () => { res.writeHead(502); res.end('Backend unavailable'); });
    req.pipe(proxy);
    return;
  }
  const requestPath = new URL(req.url, 'http://localhost').pathname;
  const file = routes[requestPath] || requestPath.replace(/^\//, '');
  const target = path.join(root, file || 'index.html');
  if (!target.startsWith(root) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, {'Content-Type': types[path.extname(target)] || 'application/octet-stream'}); fs.createReadStream(target).pipe(res);
}).listen(process.env.PORT || 3000, process.env.HOST || '0.0.0.0');