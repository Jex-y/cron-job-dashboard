const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const auth = require('../routes/auth');
const api = require('../routes/api');
const logging = require('./logging');

module.exports = (db) => {
    const app = express();

    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(logRequests);
    app.use(express.static(path.join(__dirname, '../client'), {
        extensions: ['html']
    }));
    // app.use(bodyParser.json())
    
    app.use('/auth', auth.router(db));
    app.use('/api/', auth.middleware(db, false), api(db));
    return app;
};

function logRequests(req, res, next) {
    logging.info(`${req.socket.remoteAddress} ${req.method} ${req.originalUrl}`);
    next();
}

// TODO: Make sure that all awaits are caught if they fail
