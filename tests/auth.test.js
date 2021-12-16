require('dotenv-flow').config();
const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const db = require('../app/database');
const app = require('../app/app')(db);

const server = supertest(app);

describe('POST /auth', () => {

    beforeEach(async () => {
        db.clear();
        db.addUser('test', 'test@email.com', 
            bcrypt.hashSync('password', parseInt(process.env.BCRYPT_COST))
        );
    });

    it(
        'Valid credentails should return a valid JWT', async () => {
            const res = await server.post('/auth')
                .send('email=test@email.com&pass=password');
            expect(res.status).toEqual(200);
            expect(jwt.verify(
                res.body.token, process.env.SECRET
            )).toBeTruthy();
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
    beforeEach(() => {
        db.clear();
        db.addUser('takenuser', 'taken@email.com', 
            bcrypt.hashSync('password', parseInt(process.env.BCRYPT_COST))
        );
    });

    it(
        'Registering with a valid credentials should return a valid JWT', async () => {
            const res = await server.post('/auth/register')
                .send('name=testuser&email=test@email.com&pass=password');
            expect(res.status).toEqual(200);
            expect(jwt.verify(
                res.body.token, process.env.SECRET
            )).toBeTruthy();
        });

    it(
        'Registering with a username that has already been used should not result in an error and should return an valid JWT', async () => {
            const res = await server.post('/auth/register')
                .send('name=takenuser&email=test@email.com&pass=password');
            expect(res.status).toEqual(200);
            expect(jwt.verify(
                res.body.token, process.env.SECRET
            )).toBeTruthy();
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
