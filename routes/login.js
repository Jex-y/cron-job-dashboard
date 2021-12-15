let express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const validateEmail = (email) => 
    email.match(
        //eslint-disable-next-line
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );

module.exports = (db) => {
    let router = express.Router();

    router.post('/', async (req, res) => {
        const { email, pass } = req.body;
        if (!(email && pass)) {
            return res.status(400).send({
                error:'Data sent does not contain a username and password'});
        }
        let user = await db.getUserByEmail(email);
        if (user) {
            const validPass = bcrypt.compareSync(pass, user.pass);
            if (validPass) {
                let token = jwt.sign(
                    {user: email}, 
                    process.env.SECRET, 
                    {'expiresIn':process.env.AUTH_TOKENLIFE}
                );
    
                return res.status(200).send({
                    msg:'Authenticated successfully', 
                    token:token
                });

            } else {
                return res.status(403).send({msg:'Password Incorrect'});
            }
        } else {
            return res.status(401).send({msg:'User does not exist'});
        }
    });
    
    router.post('/register', async (req, res) => {
        const { name, email, pass } = req.body;
        if (!(name && email && pass)) {
            return res.status(400).send({
                error:'Request sent does not contain a name, email and password'
            });
        }

        if (!validateEmail(email)) {
            return res.status(400).send({
                error:'Email is not valid'
            });
        }

        let user = await db.getUserByEmail(email);
        if (user) {
            return res.status(400).send({
                error:'There is already a user registered with that email'
            });
        }

        await db.addUser(name, email, 
            bcrypt.hash(pass, parseInt(process.env.BCRYPT_COST))
        );

        let token = jwt.sign(
            {user: email},
            process.env.SECRET,
            {'expiresIn':process.env.AUTH_TOKENLIFE}
        );

        res.status(200).send({
            msg:'User sucsessfully created',
            token:token
        });
    });
    return router;
};