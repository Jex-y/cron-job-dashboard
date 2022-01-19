let express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const uuid = require('uuid');

const logging = require('../app/logging');

const validateEmail = (email) =>
    email.match(
        //eslint-disable-next-line
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );

module.exports.router = (db) => {
    let router = express.Router();

    router.post('/login', async (req, res) => {
        const { email, pass } = req.body;
        if (!(email && pass)) {
            return res.status(400).send({
                error: 'Data sent does not contain an email and password'
            });
        }
        let user = await db.getUserByEmail(email);
        if (user) {
            const validPass = bcrypt.compareSync(pass, user.pass);
            if (validPass) {
                let token = jwt.sign(
                    { user: user.id },
                    process.env.SECRET,
                    { 'expiresIn': process.env.AUTH_TOKENLIFE }
                );

                return res.status(200).send({
                    msg: 'Authenticated successfully',
                    token: token
                });

            }
        }
        // Do not want to give away which one is incorrect as that means that someone can check if an account exists.
        return res.status(403).send({ error: 'Email or password incorrect' });
    });

    router.post('/register', async (req, res) => {
        const { name, email, pass } = req.body;
        if (!(name && email && pass)) {
            return res.status(400).send({
                error: 'Request sent does not contain a name, email and password'
            });
        }

        if (!validateEmail(email)) {
            return res.status(422).send({
                error: 'Email is not valid'
            });
        }

        let user = await db.getUserByEmail(email);
        if (user) {
            return res.status(409).send({
                error: 'There is already a user registered with that email'
            });
        }

        let id = await db.addUser(name, email,
            bcrypt.hash(pass, parseInt(process.env.BCRYPT_COST))
        );

        let token = jwt.sign(
            { user: id },
            process.env.SECRET,
            { 'expiresIn': process.env.AUTH_TOKENLIFE }
        );

        res.status(200).send({
            msg: 'User sucsessfully created',
            token: token
        });
    });
    return router;
};

module.exports.middleware = (db, redirect = true) => {
    return async (req, res, next) => {
        let { authorization } = req.headers;
        if (!authorization) {
            authorization = req.cookies.authorization;
        }
        let decoded = undefined;
        if (authorization) {
            if (authorization.includes('Bearer')) {
                authorization = authorization.split(' ')[1];
            }
            try {
                decoded = jwt.verify(authorization, process.env.SECRET);
            }
            catch (e) {
                if (e instanceof jwt.TokenExpiredError) {
                    logging.info('Authorization invalid: token expired');
                } else if (e instanceof jwt.JsonWebTokenError) {
                    logging.info(`Authorization invalid: ${e.message}`);
                }
            }
        }
        if (!decoded) {
            if (redirect) {
                return res.redirect(302, '/login');
            } else {
                return res.status(403).send({error: 'Invalid token'});
            }
        } else {
            let userID = decoded.user;
            let user = await db.getUserByID(userID);
            // console.log(user);
            if (!user || !uuid.validate(userID)) {
                logging.info('Authorization invalid: invalid user id');
                if (redirect) {
                    return res.redirect(302, '/login');
                } else {
                    return res.status(403).send({ error: 'Invalid user id' });
                }
            }
        }

        res.locals.userID = decoded.user;
        next();
    };
};