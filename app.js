const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const logging = require('./logging');

module.exports = (db) => {
    const app = express();

    app.use(bodyParser.urlencoded({ extended: false }));
    // app.use(bodyParser.json())

    app.post('/login', async (req, res) => {
        const { email, pass } = req.body;
        if (!(email && pass)) {
            return res.status(400).send({
                error:'Data sent does not contain a username and password'});
        }

        let user = await db.getUser(email);
        if (user) {
            const validPass = bcrypt.compareSync(pass, user.pass);
            if (validPass) {
                let token = jwt.sign(
                    {user: email}, 
                    process.env.SECRET, 
                    {"expiresIn":process.env.AUTH_TOKENLIFE}
                );

                return res.status(200).send({msg:'Authenticated successfully', token:token});
            } else {
                return res.status(400).send({msg:'Password Incorrect'});
            }
        } else {
            return res.status(400).send({msg:'User does not exist'});
        }
    });
    return app;
}
