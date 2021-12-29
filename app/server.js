const http = require('http');
require('dotenv-flow').config();

const logging = require('./logging');
const Database = require('../app/database');
const db = new Database(process.env.DB_DATAFILE);
const app = require('./app')(db);

const server = http.createServer(app);

const port = process.env.SERVER_PORT;
const host = process.env.SERVER_HOST;

server.listen(port, host, () => {
    logging.info(`Server started. Listening on http://${host}:${port}`);    
});

module.exports = { server };