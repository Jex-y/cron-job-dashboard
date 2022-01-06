require('dotenv-flow').config();
const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const uuid = require('uuid');

const Database = require('../app/database');
const { exp } = require('mathjs');

describe('GET /:jobName', () => {
    const db = new Database('data/api_test_db1.json');
    const app = require('../app/app')(db);
    const server = supertest(app);
    let userID = null;
    let token = null;


    beforeEach(async () => {
        await db.clear();
        userID = await db.addUser('testUser', 'test@email.com',
            bcrypt.hashSync('password', parseInt(process.env.BCRYPT_COST))
        );

        token = jwt.sign(
            { user: userID },
            process.env.SECRET,
            { 'expiresIn': process.env.AUTH_TOKENLIFE }
        );
    });

    // afterAll(async () => {
    //     await db.detele();
    // });

    it(
        'Getting info for a job that has not yet been run yet should result in an error', async () => {
            const jobName = 'testjob';
            await db.addJob(userID, jobName);

            const res = await server.get(`/api/${jobName}`)
                .set('authorization', 'Bearer ' + token);

            expect(res.status).toEqual(400);
            expect(res.body.error).toEqual(`${jobName} has not been run`);
        });

    it(
        'Getting info for a job that is currently running for the first time should result in an error', async () => {
            const jobName = 'testjob';
            await db.addJob(userID, jobName);
            await db.startRun(userID, jobName);

            const res = await server.get(`/api/${jobName}`)
                .set('authorization', 'Bearer ' + token);

            expect(res.status).toEqual(400);
            expect(res.body.error).toEqual(`${jobName} is currently running for the first time`);
        });

    it(
        'Getting info for a job should return without an error after 1 run', async () => {
            const jobName = 'testjob';
            await db.addJob(userID, jobName);
            let start = await db.startRun(userID, jobName);
            await sleep(100); // wait 100ms 
            await db.endRun(userID, jobName, start);

            const res = await server.get(`/api/${jobName}`)
                .set('authorization', 'Bearer ' + token);

            expect(res.status).toEqual(200);

            let minDuration = 0.1;
            let maxDuration = 0.2;
            expect(res.body).toMatchObject({
                stdevDuration: 0,
                lastRunDate: start,
                lastRunStatus: 'finished',
                lastTooSlow: false,
                lastTooFast: false,
                numRuns: 1
            });
            expect(res.body.meanDuration).toBeGreaterThanOrEqual(minDuration);
            expect(res.body.meanDuration).toBeLessThanOrEqual(maxDuration);

            expect(res.body.lastRunDuration).toBeGreaterThanOrEqual(minDuration);
            expect(res.body.lastRunDuration).toBeLessThanOrEqual(maxDuration);
        });

    it(
        'Getting info for a job after several runs should return all relevent information', async () => {
            // Numbers generated in a spreadsheet.
            const runtimes = [
                108.4116966,
                90.49865899,
                93.9536362,
                103.0461368,
                92.08594257,
                114.1388525,
                92.76786912,
                103.5921399,
                123.5959612,
                107.3007784,
            ];
            const mean = 102.9391672;
            const stdev = 10.84384074;
            const spacing = 100;

            const jobName = 'testjob';
            await db.addJob(userID, jobName);
            let start;
            for (let i of runtimes) {
                start = await db.startRun(userID, jobName);
                await sleep(i);
                await db.endRun(userID, jobName, start);
                await sleep(spacing);
            }

            const res = await server.get(`/api/${jobName}`)
                .set('authorization', 'Bearer ' + token);

            expect(res.status).toEqual(200);
            expect(res.body).toMatchObject({
                lastRunDate: start,
                lastRunStatus: 'finished',
                lastTooSlow: false,
                lastTooFast: false,
                numRuns: runtimes.length,
                history: new Array(runtimes.length).fill('finished')
            });

            let min = mean / 1000;
            let max = min + 0.1;
            expect(res.body.meanDuration).toBeGreaterThanOrEqual(min);
            expect(res.body.meanDuration).toBeLessThanOrEqual(max);

            min = (runtimes.slice(-1)[0] / 1000) - 0.1;
            max = min + 0.2;
            expect(res.body.lastRunDuration).toBeGreaterThanOrEqual(min);
            expect(res.body.lastRunDuration).toBeLessThanOrEqual(max);

            let tolerance = 0.5;
            min = (stdev - (tolerance * stdev)) / 1000;
            max = (stdev + (tolerance * stdev)) / 1000;
            expect(res.body.stdevDuration).toBeGreaterThanOrEqual(min);
            expect(res.body.stdevDuration).toBeLessThanOrEqual(max);

            tolerance = 0.2;
            let freq = spacing / 1000;
            min = freq - (tolerance * freq);
            max = freq * 3;
            expect(res.body.frequency).toBeGreaterThanOrEqual(min);
            expect(res.body.frequency).toBeLessThanOrEqual(max);
        });
});

describe('API authentication', () => {
    const db = new Database('data/api_test_db2.json');
    const app = require('../app/app')(db);
    const server = supertest(app);
    let userID = null;
    let token = null;

    it(
        'Any call to the api with a token with an invalid userID should return an error', async () => {
            const jobName = 'testjob';
            let invaliduserID = uuid.v4();

            let invaliduserIDToken = jwt.sign(
                { user: invaliduserID },
                process.env.SECRET,
                { 'expiresIn': process.env.AUTH_TOKENLIFE }
            );

            const res = await server.get(`/api/${jobName}`)
                .set('authorization', 'Bearer ' + invaliduserIDToken);

            expect(res.status).toEqual(403);

            
        });

    it(
        'Any call with a token that does not have a valid signature should return an error', async () => {
            const jobName = 'testjob';

            let invaldToken = jwt.sign(
                { user: userID },
                'NOT THE SECRET',
                { 'expiresIn': process.env.AUTH_TOKENLIFE }
            );

            const res = await server.get(`/api/${jobName}`)
                .set('authorization', 'Bearer ' + invaldToken);

            expect(res.status).toEqual(403);
        });

    it(
        'Any call with a token that is expired should return an error', async () => {
            const jobName = 'testjob';

            let expiredToken = jwt.sign(
                { user: userID },
                process.env.SECRET,
                { 'expiresIn': '1ms' }
            );
            
            await sleep(10);

            const res = await server.get(`/api/${jobName}`)
                .set('authorization', 'Bearer ' + expiredToken);

            expect(res.status).toEqual(403);
        });

    it(
        'Any call with no token should return an error', async () => {
            const jobName = 'testjob';
            const res = await server.get(`/api/${jobName}`);
            expect(res.status).toEqual(403);
        });
});

describe('POST /:jobName', () => {
    const db = new Database('data/api_test_db3.json');
    const app = require('../app/app')(db);
    const server = supertest(app);
    let userID = null;
    let token = null;

    beforeEach(async () => {
        await db.clear();
        userID = await db.addUser('testUser', 'test@email.com',
            bcrypt.hashSync('password', parseInt(process.env.BCRYPT_COST))
        );

        token = jwt.sign(
            { user: userID },
            process.env.SECRET,
            { 'expiresIn': process.env.AUTH_TOKENLIFE }
        );
    });

    // afterAll(async () => {
    //     await db.detele();
    // });

    it(
        'Adding a new job should create a job in the database', async () => {
            const jobName = 'testjob';
            const res = await server.post(`/api/${jobName}`)
                .set('authorization', 'Bearer ' + token)
                .send('action=add');

            expect(res.status).toEqual(200);

            let jobs = await db.getJobsByUser(userID);
            expect(jobs).toHaveLength(1);

            let job = jobs[0];
            expect(job.name == jobName).toBeTruthy();
            expect(job.user == userID).toBeTruthy();

            let runs = await db.getRuns(userID, jobName);
            expect(runs).toHaveLength(0);
        });

    it(
        'Starting a job should make a new run in the database', async () => {
            const jobName = 'testjob';
            await db.addJob(userID, jobName);

            const res = await server.post(`/api/${jobName}`)
                .set('authorization', 'Bearer ' + token)
                .send('action=start');

            expect(res.status).toEqual(200);

            let runs = await db.getRuns(userID, jobName);
            expect(runs).toHaveLength(1);

            let run = runs[0];
            expect(run).toMatchObject({
                user: userID,
                name: jobName,
                finish: null,
                status: 'running'
            });

            let start = Date.parse(run.start);
            let diff = (new Date()) - start;

            expect(diff).toBeLessThan(1000); // Job started less than a second ago
            expect(diff).toBeGreaterThanOrEqual(0);
        });

    it(
        'Staring a job that has not been created should create the job in the database and start it', async () => {
            const jobName = 'testjob';

            const res = await server.post(`/api/${jobName}`)
                .set('authorization', 'Bearer ' + token)
                .send('action=start');

            expect(res.status).toEqual(200);

            let jobs = await db.getJobsByUser(userID);
            expect(jobs).toHaveLength(1);

            let job = jobs[0];
            expect(job.name == jobName).toBeTruthy();
            expect(job.user == userID).toBeTruthy();

            let runs = await db.getRuns(userID, jobName);
            expect(runs).toHaveLength(1);

            let run = runs[0];
            expect(run).toMatchObject({
                user: userID,
                name: jobName,
                finish: null,
                status: 'running'
            });

            let start = Date.parse(run.start);
            let diff = (new Date()) - start;

            expect(diff).toBeLessThan(1000); // Job started less than a second ago
            expect(diff).toBeGreaterThanOrEqual(0);
        });


    it(
        'Stopping a run that has been started should return without an error', async () => {
            const jobName = 'testjob';
            await db.addJob(userID, jobName);
            await db.startRun(userID, jobName);

            const res = await server.post(`/api/${jobName}`)
                .set('authorization', 'Bearer ' + token)
                .send('action=stop');

            expect(res.status).toEqual(200);
        });

    it(
        'Failing a run that has been started should return without an error', async () => {
            const jobName = 'testjob';
            await db.addJob(userID, jobName);
            await db.startRun(userID, jobName);

            const res = await server.post(`/api/${jobName}`)
                .set('authorization', 'Bearer ' + token)
                .send('action=fail');

            expect(res.status).toEqual(200);
        });

    it(
        'Stopping a run that has not yet been started should return an error', async () => {
            const jobName = 'testjob';
            await db.addJob(userID, jobName);
            await sleep(100);

            const res = await server.post(`/api/${jobName}`)
                .set('authorization', 'Bearer ' + token)
                .send('action=stop');

            expect(res.status).toEqual(400);
            expect(res.body.error).toEqual('Job was not running');
        });

    it(
        'Failing a run that has not yet been started should return an error', async () => {
            const jobName = 'testjob';
            await db.addJob(userID, jobName);

            const res = await server.post(`/api/${jobName}`)
                .set('authorization', 'Bearer ' + token)
                .send('action=fail');

            expect(res.status).toEqual(400);
            expect(res.body.error).toEqual('Job was not running');
        });


    it(
        'Trying to get, stop or fail a job that has not been created should return an error', async () => {
            const jobName = 'testjob';

            const resInfo = await server.get(`/api/${jobName}`)
                .set('authorization', 'Bearer ' + token);

            expect(resInfo.status).toEqual(400);
            expect(resInfo.body.error).toEqual('No such job exists');

            const resStop = await server.post(`/api/${jobName}`)
                .set('authorization', 'Bearer ' + token)
                .send('action=stop');

            expect(resStop.status).toEqual(400);
            expect(resStop.body.error).toEqual('No such job exists');

            const resFail = await server.post(`/api/${jobName}`)
                .set('authorization', 'Bearer ' + token)
                .send('action=fail');

            expect(resFail.status).toEqual(400);
            expect(resFail.body.error).toEqual('No such job exists');
        });

    it(
        'A call with the wrong method shoud return an error', async () => {
            const methods = ['get', 'post', 'put', 'del'];
            const validMethods = {
                '': ['get'],
                'add': ['post'],
                'start': ['post'],
                'stop': ['post'],
                'fail': ['post']
            };
            const jobName = 'testjob';

            for (const [action, allowed] of Object.entries(validMethods)) {
                for (const method of methods) {
                    if (!(allowed.includes(method))) {
                        const res = await server[method](`/api/${jobName}`)
                            .set('authorization', 'Bearer ' + token)
                            .send(`action=${action}`);
                        expect(res.status).toEqual(405);
                    }
                }
            }
        });

    it(
        'Adding a job that has already been added should result in an error', async () => {
            const jobName = 'testjob';
            await db.addJob(userID, jobName);

            const res = await server.post(`/api/${jobName}`)
                .set('authorization', 'Bearer ' + token)
                .send('action=add');

            expect(res.status).toEqual(400);
            expect(res.body.error).toEqual(`${jobName} already exists`);
        });

    it(
        'Trying to use an action that does not exist should result in an error', async () => {
            const jobName = 'testjob';
            const action = 'not_an_action';
            await db.addJob(userID, jobName);

            const res = await server.post(`/api/${jobName}`)
                .set('authorization', 'Bearer ' + token)
                .send(`action=${action}`);
            
            expect(res.status).toEqual(400);
            expect(res.body.error).toEqual(`Unknown action ${action}`);
        });

    it(
        'Adding or starting a job called job should fail', async () => {
            const resAdd = await server.post('/api/job')
                .set('authorization', 'Bearer ' + token)
                .send('action=add');

            expect(resAdd.status).toEqual(400);
            expect(resAdd.body.error).toEqual('Invalid job name');

            const resStart = await server.post('/api/job')
                .set('authorization', 'Bearer ' + token)
                .send('action=start');

            expect(resStart.status).toEqual(400);
            expect(resStart.body.error).toEqual('Invalid job name');
        });
});

describe('GET /jobs', () => {
    const db = new Database('data/api_test_db3.json');
    const app = require('../app/app')(db);
    const server = supertest(app);
    let userID = null;
    let token = null;

    beforeEach(async () => {
        await db.clear();
        userID = await db.addUser('testUser', 'test@email.com',
            bcrypt.hashSync('password', parseInt(process.env.BCRYPT_COST))
        );

        token = jwt.sign(
            { user: userID },
            process.env.SECRET,
            { 'expiresIn': process.env.AUTH_TOKENLIFE }
        );
    });

    it(
        'A call should return the names of all jobs belonging to a user', async () => {
            const jobNames = [
                'job1',
                'job2',
                'job3'
            ];

            for (let name of jobNames) {
                await db.addJob(userID, name);
            }

            const res = await server.get('/api/jobs')
                .set('authorization', 'Bearer ' + token);    
            
            expect(res.status).toEqual(200);
            expect(res.body).toMatchObject({
                jobs: jobNames
            });
            expect(res.body.jobs).toHaveLength(jobNames.length);

        });

});

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}