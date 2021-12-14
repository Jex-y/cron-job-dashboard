const express = require('express');

const bodyParser = require('body-parser');

const login = require('../routes/login');

module.exports = (db) => {
    const app = express();

    app.use(bodyParser.urlencoded({ extended: false }));
    // app.use(bodyParser.json())
    
    app.use('/login', login(db));
    return app;
};
