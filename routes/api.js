const express = require('express');
const math = require('mathjs');
const jwt = require('jsonwebtoken');

module.exports = (db) => {
    let router = express.Router();

    router.get('/jobs', async (req, res) => {
        const { userID } = res.locals;

        const jobs = db.getJobsByUser(userID)
            .then(jobs => jobs.map(item => item.name));
        return res.status(200).send({ jobs: await jobs });
    });

    router.all('/job/:jobName', async (req, res) => {
        const { action } = req.body;
        const { userID } = res.locals;
        let { jobName } = req.params;

        jobName = decodeURI(jobName);

        let job = await db.getUserJob(userID, jobName);

        if (!(req.method == 'GET' && !action) && !(req.method == 'POST' && action)) {
            return res.status(405).send({
                error: 'Invalid method, use GET for getting job data and POST for modifying a job'
            });
        }

        if (!job) {
            if (action == 'add') {
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
                return res.status(200).send({
                    msg: `${jobName} has not been run`,
                });
            }

            let allRuns = await db.getRuns(userID, jobName);
            let history = allRuns.filter(run => run.finish).sort((run1, run2) => Date.parse(run1.start) - Date.parse(run2.start)).slice(-10).map(run => run.status);
            let runTimes = allRuns.filter(run => run.status == 'finished').map(run => (Date.parse(run.finish) - Date.parse(run.start)) / 1000);
            if (runTimes.length == 0) {
                return res.status(200).send({
                    msg: `${jobName} is currently running for the first time`
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
                let runTimeExOutliers = runTimes.filter(runtime => (min <= runtime) && (runtime <= max));
                meanExOutliers = math.mean(runTimeExOutliers);
                lastTooSlow = lastRunDuration > max;
                lastTooFast = lastRunDuration < min;
            }
            
            let frequency = null;
            if (allRuns.length >= 2) {
                const startDates = allRuns.map(run => Date.parse(run.start));
                startDates.sort();
                const periods = [];
                for (let i = 1; i < startDates.length; i ++) {
                    periods.push((startDates[i] - startDates[i-1])/1000);
                }
                if (periods.length > 1) {
                    const meanPeriod = math.mean(periods);
                    const stdevPeriod = math.std(periods);
                    const periodOutlierStdevs = parseFloat(process.env.PERIOD_OUTLIER_STDEV);
                    const min = meanPeriod - (periodOutlierStdevs * stdevPeriod);
                    const max = meanPeriod + (periodOutlierStdevs * stdevPeriod);
                    const periodsExOutliers = periods.filter(period => (min <= period) && (period <= max));
                    frequency = math.mean(periodsExOutliers);
                } else{
                    frequency = periods[0];
                }
            }


            info = {
                meanDuration: meanExOutliers,
                stdevDuration: stdev,
                lastRunDate: lastRun.start,
                lastRunDuration: lastRunDuration,
                lastRunStatus: lastRun.status,
                lastTooSlow: lastTooSlow,
                lastTooFast: lastTooFast,
                numRuns: allRuns.length,
                frequency: frequency,
                history: history
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

    router.get('/gen-token', async (req, res) => {
        const { userID } = res.locals;
        const { expire } = req.body;

        let options = {};
        if (expire) {
            options = { 'expiresIn': expire} ;
        }
        let token = jwt.sign(
            { user: userID },
            process.env.SECRET,
            options
        );

        return res.status(200).send({ token: token});
    });

    return router;
};
