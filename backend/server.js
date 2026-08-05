require('dotenv').config();

const app = require('./app');
const connectDB = require('./utils/mongo');

const port = process.env.NODE_PORT || 5175;

async function startServer() {
    await connectDB();

    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}

startServer();
