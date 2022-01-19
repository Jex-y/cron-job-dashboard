require('dotenv-flow').config();
const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const uuid = require('uuid');

const Database = require('../app/database');

describe('POST /login', () => {
    const db = new Database('data/auth_test_db1.json');
    const app = require('../app/app')(db);
    const server = supertest(app);
    let userId = null;
    beforeEach(async () => {
        await db.clear();
        userId = await db.addUser('test', 'test@email.com', 
            bcrypt.hashSync('password', parseInt(process.env.BCRYPT_COST))
        );
    });

    // afterAll(async () => {
    //     await db.detele();
    // });

    it(
        'Valid credentails should return a valid JWT', async () => {
            const res = await server.post('/login')
                .send('email=test@email.com&pass=password');
            expect(res.status).toEqual(200);
            let token = jwt.verify(
                res.body.token, process.env.SECRET
            );
            expect(token).toBeTruthy();
            expect(token.user).toEqual(await userId);
        });

    it(
        'Invalid credentails should return an error and no token', async () => {
            const res = await server.post('/login')
                .send('email=test@email.com&pass=notmypassword');
            expect(res.status).toEqual(403);
            expect(res.body.token).toBeUndefined();
        });

    it(
        'Invalid email should return an error and no token', async () => {
            const res = await server.post('/login')
                .send('email=notmyemail@email.com&pass=password');
            expect(res.status).toEqual(403);
            expect(res.body.token).toBeUndefined();
        });

    it(
        'Empty credentials should return an error and no token', async () => {
            const res = await server.post('/login');
            expect(res.status).toEqual(400);
            expect(res.body.token).toBeUndefined();
        });
});

describe('POST /register', () => {
    const db = new Database('data/auth_test_db2.json');
    const app = require('../app/app')(db);
    const server = supertest(app);

    beforeEach(() => {
        db.clear();
        db.addUser('takenuser', 'taken@email.com', 
            bcrypt.hashSync('password', parseInt(process.env.BCRYPT_COST))
        );
    });

    // afterAll(async () => {
    //     await db.detele();
    // });

    it(
        'Registering with valid credentials should return a valid JWT', async () => {
            const res = await server.post('/register')
                .send('name=testuser&email=test@email.com&pass=password');
            expect(res.status).toEqual(200);
            let token = jwt.verify(
                res.body.token, process.env.SECRET
            );
            expect(token).toBeTruthy();
            expect(uuid.validate(token.user)).toBeTruthy();
        });

    it(
        'Registering with a username that has already been used should not result in an error and should return an valid JWT', async () => {
            const res = await server.post('/register')
                .send('name=takenuser&email=test@email.com&pass=password');
            expect(res.status).toEqual(200);
            let token = jwt.verify(
                res.body.token, process.env.SECRET
            );
            expect(token).toBeTruthy();
            expect(uuid.validate(token.user)).toBeTruthy();
        });

    it(
        'Registering with an email that is already used should return an error', async () => {
            const res = await server.post('/register')
                .send('name=testuser&email=taken@email.com&pass=password');
            expect(res.status).toEqual(409);
            expect(res.body.token).toBeUndefined();
        });

    it(
        'Registering with an invalid email should return an error', async () => {
            const res = await server.post('/register')
                .send('name=testuser&email=notanemail.com&pass=password');
            expect(res.status).toEqual(422);
            expect(res.body.token).toBeUndefined();
        });

    it(
        'Registering with any empty credentials should return an error', async () => {
            let name = 'testUser';
            let email = 'test@email.com';
            let pass = 'password';

            for (let i = 0; i < 7; i++) {
                let text = '';
                if (i & 1) {
                    text += `name=${name}`;
                }
                if ((i >> 1) & 1) {
                    if (text) {
                        text += '&';
                    }
                    text += `email=${email}`;
                }
                if ((i >> 2) & 1) {
                    if (text) {
                        text += '&';
                    }
                    text += `pass=${pass}`;
                }
                const res = await server.post('/register')
                    .send(text);
                expect(res.status).toEqual(400);
                expect(res.body.token).toBeUndefined();
                expect(res.body.error).toEqual('Request sent does not contain a name, email and password');
            }
        });

});
