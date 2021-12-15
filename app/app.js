const express = require('express');

const bodyParser = require('body-parser');

const login = require('../routes/login');
const api = require('../routes/api');

module.exports = (db) => {
    const app = express();

    app.use(bodyParser.urlencoded({ extended: false }));
    // app.use(bodyParser.json())
    
    app.use('/login', login(db));
    app.use('/api/', api(db));
    return app;
};

// TODO: Make sure that all awaits are caught if they fail
