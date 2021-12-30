const express = require('express');
const math = require('mathjs');

module.exports = (db) => {
    let router = express.Router();

    router.get('/jobs', async (req, res) => {
        const { userID } = res.locals;

        const jobs = db.getJobsByUser(userID)
            .then(jobs => jobs.map(item => item.name));
        return res.status(200).send({ jobs: await jobs });
    });

    router.all('/:jobName', async (req, res) => {
        const { action } = req.body;
        const { jobName } = req.params;
        const { userID } = res.locals;

        let job = await db.getUserJob(userID, jobName);

        if (!(req.method == 'GET' && !action) && !(req.method == 'POST' && action)) {
            return res.status(405).send({
                error: 'Invalid method, use GET for getting job data and POST for modifying a job'
            });
        }

        if (!job) {
            if (jobName == 'job') {
                return res.status(400).send({ error: 'Invalid job name' });
            } else if (action == 'add') {
                db.addJob(userID, jobName);
                return res.status(200).send({ msg: 'Job successfully created' });
            } else if (action == 'start') {
                job = db.addJob(userID, jobName);
            } else {
                return res.status(400).send({ error: 'No such job exists' });
            }
        }

        if (!action) {
            let lastRun = await db.getLastRun(userID, jobName);

            let info = {};

            if (!lastRun) {
                return res.status(400).send({
                    error: `${jobName} has not been run`,
                });
            }

            let allRuns = await db.getRuns(userID, jobName);
            let runTimes = allRuns.filter(run => run.status == 'finished').map(run => (Date.parse(run.finish) - Date.parse(run.start)) / 1000);
            if (runTimes.length == 0) {
                return res.status(400).send({
                    error: `${jobName} is currently running for the first time`
                });
            }

            let mean = math.mean(runTimes);
            let stdev = math.std(runTimes);
            let lastRunDuration = lastRun.status == 'running' ? null : (Date.parse(lastRun.finish) - Date.parse(lastRun.start)) / 1000;

            let meanExOutliers;
            let lastTooSlow = false;
            let lastTooFast = false;

            if (stdev == 0) {
                meanExOutliers = mean;
            } else {
                let outlierStdevs = parseFloat(process.env.RUN_OUTLIER_STDEV);
                let min = mean - (outlierStdevs * stdev);
                let max = mean + (outlierStdevs * stdev);
                let runTimeExOutliers = runTimes.filter(runtime => (min < runtime) && (runtime < max));
                meanExOutliers = math.mean(runTimeExOutliers);
                lastTooSlow = lastRunDuration > max;
                lastTooFast = lastRunDuration < min;
            }


            info = {
                meanDuration: meanExOutliers,
                stdevDuration: stdev,
                lastRunDate: lastRun.start,
                lastRunDuration: lastRunDuration,
                lastRunStatus: lastRun.status,
                lastTooSlow: lastTooSlow,
                lastTooFast: lastTooFast,
                numRuns: allRuns.length
            };

            return res.status(200).send(info);

        } else if (action == 'start') {
            await job;
            db.startRun(userID, jobName);
            return res.status(200).send({ msg: `${jobName} started` });
        } else if (action == 'stop' || action == 'fail') {
            let run = await db.getLastRun(userID, jobName);
            if (!run || run.finish) {
                return res.status(400).send({
                    error: 'Job was not running',
                });
            }

            if (action == 'stop') {
                db.endRun(userID, jobName, run.start);
                return res.status(200).send({ msg: `${jobName} stopped` });
            } else {
                db.failRun(userID, jobName, run.start);
                return res.status(200).send({ msg: `${jobName} failed` });
            }
        } else if (action == 'add') {
            return res.status(400).send({ error: `${jobName} already exists` });
        } else {
            return res.status(400).send({
                error: `Unknown action ${action}`,
            });
        }
    });
    return router;
};
