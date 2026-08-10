const http = require('http');

const app = http.createServer((req, res) => {
    // API route templates
    // if (req.url === '/api/users' && req.method === 'GET') {
    //     res.writeHead(200, { 'Content-Type': 'application/json' });
    //     res.end(JSON.stringify({ message: 'Get all users' }));
    //     return;
    // }
    // if (req.url === '/api/users' && req.method === 'POST') {
    //     res.writeHead(201, { 'Content-Type': 'application/json' });
    //     res.end(JSON.stringify({ message: 'Create a user' }));
    //     return;
    // }

    if (req.url === '/' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('API is running...\n');
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found\n');
});

module.exports = app;
