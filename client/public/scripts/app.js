/* eslint-disable no-undef */
'use strict';

(() => {
    updateAllJobs();
    document.querySelector('#logout').addEventListener('OnClick', logout);
})();

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
    const sucsessBadge = '<span class="badge bg-success">Passing</span>';
    const failBadge = '<span class="badge bg-danger">Failed</span>';
    const runningBadge = '<span class="visually-hidden">Running...</span>';
    const template = document.querySelector('#job-card');
    const table = document.querySelector('#jobs-table');
    const children = table.children;
    console.log(children);
    jobs = await jobs;
    
    for (let i = 0; i < jobs.length; i ++ ) {
        (async () => {
            let details = getJobDetails(jobs[i]);

            let card = template.content.cloneNode(true);

            const jobName = card.querySelector('#jobName');
            const badge = card.querySelector('#badge');
            const lastDuration = card.querySelector('#last-duration');
            const meanDuration = card.querySelector('#avg-duration');
            const lastRun = card.querySelector('#last-run');
            const frequency = card.querySelector('#frequency');
            const history = card.querySelector('#history');

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

            if (details.frequency) {
                frequency.textContent = periodToString(details.frequency);
            } else {
                frequency.textContent = 'N/A';
            }
            let child = children[i];
            if (child) {
                child.replaceWith(card);
            } else {
                table.appendChild(card);
            }
            console.log(details.history);
            for (let i = 0; i < 10; i++) {
                let style = '';
                if (details.history[i]) {
                    console.log(details.history[i]);
                    if (details.history[i] == 'finished') {
                        style = ' bg-success';
                    } else if (details.history[i] == 'failed') {
                        style = ' by-danger';
                    }
                    const bar = document.createElement('div');
                    history.appendChild(bar);
                    bar.outerHTML = `<div class="progress-bar${style}" role="progressbar" style="width: 10%" aria-valuenow="10" aria-valuemin="0" aria-valuemax="100"></div>`;
                }
            }
        })();
    }
}

async function logout() {
    document.cookie = '';
    window.location.href = '/login';
}

function periodToString(period) {
    function checkPeriod(period, secondsInPeriod, periodName) {
        period = Math.round(period / secondsInPeriod);
        if (period == 1) {
            return `Every ${periodName}`;
        }
        return `Every ${period} ${periodName}s`;
    }
    const periods = {
        Month : 60 * 60 * 24 * 30.42,
        Week : 60 * 60 * 24 * 7,
        Day : 60 * 60 * 24,
        Hour : 60 * 60,
        Min : 60,
        Sec : 1,
        Mili : 0.001
    };
    for  (const [periodName, periodSeconds] of Object.entries(periods)) {
        if (period >= periodSeconds) {
            return checkPeriod(period, periodSeconds, periodName);
        }
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