require('dotenv-flow').config();
const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const uuid = require('uuid');

const Database = require('../app/database');

describe('POST /auth', () => {
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
            const res = await server.post('/auth')
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
            const res = await server.post('/auth')
                .send('email=test@email.com&pass=notmypassword');
            expect(res.status).toEqual(403);
            expect(res.body.token).toBeUndefined();
        });

    it(
        'Invalid email should return an error and no token', async () => {
            const res = await server.post('/auth')
                .send('email=notmyemail@email.com&pass=password');
            expect(res.status).toEqual(403);
            expect(res.body.token).toBeUndefined();
        });

    it(
        'Empty credentials should return an error and no token', async () => {
            const res = await server.post('/auth');
            expect(res.status).toEqual(400);
            expect(res.body.token).toBeUndefined();
        });
});

describe('POST /auth/register', () => {
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
        'Registering with a valid credentials should return a valid JWT', async () => {
            const res = await server.post('/auth/register')
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
            const res = await server.post('/auth/register')
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
            const res = await server.post('/auth/register')
                .send('name=testuser&email=taken@email.com&pass=password');
            expect(res.status).toEqual(400);
            expect(res.body.token).toBeUndefined();
        });

    it(
        'Registering with an invalid email should return an error', async () => {
            const res = await server.post('/auth/register')
                .send('name=testuser&email=notanemail.com&pass=password');
            expect(res.status).toEqual(400);
            expect(res.body.token).toBeUndefined();
        });

});
