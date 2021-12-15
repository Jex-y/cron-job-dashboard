let express = require('express');
const uuid = require('uuid');

module.exports = (db) => {
    let router = express.Router();

    router.post('/:userId/:jobName', async (req, res) => {
        const { action } = req.body;
        const { userID, jobName } = req.params;
        
        let user = await db.getUserByID(userID);
        if (!user ||  !uuid.validate(userID)) {
            return res.status(403).send({error:'Invalid user id sent'});
        }

        let job = db.getUserJob(userID, jobName);
        let newJob = !job;

        switch (action) {
        case 'start':
            if (newJob) {
                db.addJob(jobName, userID);
            }
            db.addRun(jobName, userID, (new Date()).toISOString(), null, 'pending');
            break;
        case 'stop':
            if (newJob) {
                return res.status(400).send({error:'No such job exists'});
            }
            break;
        case 'fail':
            if (newJob) {
                return res.status(400).send({error:'No such job exists'});
            }
            break;
        default:
            return res.status(400).send({
                error:`Unknown action ${action}`
            });
        }
    });
    return router;
};