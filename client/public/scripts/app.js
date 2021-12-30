/* eslint-disable no-undef */
'use strict';

const e = require("express");

async function getJobs() {
    let res = await fetch('/api/jobs', {
        method: 'GET',
        headers: new Headers({
            'Authorization': 'Bearer ' + getAuthToken()
        }),
    })
        .catch(error => console.log('error', error));

    if (res.ok) {
        res = JSON.parse(await res.text());
        return res.jobs;
    }
}

async function getJobDetails(jobName) {
    let res = await fetch(`/api/${jobName}`, {
        method: 'GET',
        headers: new Headers({
            'Authorization': 'Bearer ' + getAuthToken()
        }),
    })
        .catch(error => console.log('error', error));
    if (res.ok) {
        res = JSON.parse(await res.text());
        return res;
    } 

    // Deal with token expired / currenty running errors
}

async function updateAllJobs() {
    let jobs = getJobs();
    const sucsessBadge = '<span class="badge bg-success">Success</span>';
    const failBadge = '<span class="badge bg-danger">Failed</span>';
    const runningBadge = '<span class="visually-hidden">Running...</span>';
    const template = document.querySelector('#job-card');
    const table = document.querySelector('#jobs-table');
    jobs = await jobs;
    for (let i = 0; i < jobs.length; i ++ ) {
        let details = getJobDetails(jobs[i]);

        let card = template.content.cloneNode(true);

        const jobName = card.querySelector('#jobName');
        const badge = card.querySelector('#badge');
        const lastDuration = card.querySelector('#last-duration');
        const meanDuration = card.querySelector('#avg-duration');
        const lastRun = card.querySelector('#last-run');
        const frequency = card.querySelector('#frequency');

        jobName.textContent = jobs[i];
        details = await details;
        switch (details.lastRunStatus) {
        case 'finished':
            badge.innerHTML = sucsessBadge;
            break;
        case 'failed':
            badge.innerHTML = failBadge;
            break;
        case 'running':
        default:
            badge.innerHTML = runningBadge;
        }

        if (details.lastRunDuration) {          
            const mins = Math.trunc(details.lastRunDuration / 60);
            console.log(details.lastRunDuration);
            let secs = Math.trunc(details.lastRunDuration % 60);
            secs = String(secs);
            if (secs.length == 1) {
                secs = '0' + secs;
            }

            lastDuration.textContent =  `${mins}:${secs}`;
        } else {
            lastDuration.textContent = '--:--';
        }

        if (details.meanDuration) {          
            const mins = Math.trunc(details.meanDuration / 60);
            let secs = Math.trunc(details.meanDuration % 60);
            secs = String(secs);
            if (secs.length == 1) {
                secs = '0' + secs;
            }

            meanDuration.textContent =  `${mins}:${secs}`;
        } else {
            meanDuration.textContent = '--:--';
        }

        if (details.lastRunDate) {
            const lastRunDate = Sugar.Date(details.lastRunDate);
            lastRun.textContent = lastRunDate.relative();
        } else {
            lastRun.textContent = 'N/A';
        }

        table.appendChild(card);
    }
}

function getAuthToken() {
    const authCookieRegex = /authorization=Bearer (?<token>\S+)/;
    const token = authCookieRegex.exec(document.cookie).groups.token;
    if (!token) {
        window.location.href = '/login';
    } 
    return token;
}
