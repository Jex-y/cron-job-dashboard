require('dotenv-flow').config();
const supertest = require('supertest');
const db = require('../database');
const app = require('../app')(db);
server = supertest(app);

describe('Authentication', () => {

    beforeEach(() => {
        setupDB();
    });

    it(
        'POST /login with valid credentails should return a valid JWT', async () => {
        const res = await server.post('/login')
            .send('email=test@email.com&pass=password');
        expect(res.status).toEqual(200);
    });
});

function setupDB(){
    db.clear();
    db.addUser('test', 'test@email.com', 
    '$2b$10$m6Xts6GYlFtvnc542sc.bewvq/LNna9ZHDg2HSCy.JvVzD46E107G');
}