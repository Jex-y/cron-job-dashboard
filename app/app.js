const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

const auth = require('../routes/auth');
const api = require('../routes/api');
const logging = require('./logging');

module.exports = (db) => {
    const app = express();

    app.use(cookieParser());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(logRequests);
    app.use(express.static(path.join(__dirname, '../client/public'), {
        extensions: ['html']
    }));
    app.use('/', auth.router(db));
    app.use('/api/', auth.middleware(db, false), api(db));
    app.use(auth.middleware(db), express.static(path.join(__dirname, '../client/private'), {
        extensions: ['html']
    }));
    // app.use(bodyParser.json())
    return app;
};

function logRequests(req, res, next) {
    logging.info(`${req.socket.remoteAddress} ${req.method} ${req.originalUrl}`);
    next();
}

// TODO: Make sure that all awaits are caught if they fail
// TODO: Test to make sure that cookie authentication works
