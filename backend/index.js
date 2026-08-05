require('dotenv').config();
const http = require('http');
const connectDB = require('./utils/mongo');

const port = process.env.NODE_PORT || 5175;

// Connect to MongoDB Atlas
connectDB();

const server = http.createServer((req, res) => {
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

    // 404 Not Found
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found\n');
});

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
