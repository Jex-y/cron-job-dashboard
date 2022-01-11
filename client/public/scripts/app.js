/* eslint-disable no-undef */
'use strict';

(() => {
    updateAllJobs();
})();

async function getJobs() {
    let res;
    try {
        res = await fetch('/api/jobs', {
            method: 'GET',
            headers: new Headers({
                'Authorization': 'Bearer ' + getAuthToken()
            }),
        });
    } catch (error) {
        console.log(error);
        return await cannotConnect(getJobs);
    }

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
    });

    if (!res) {
        return await cannotConnect(async () => await getJobDetails(jobName));
    }

    if (res.ok) {
        res = JSON.parse(await res.text());
        return res;
    } else {
        let { error } = JSON.parse(await res.text());
        if (error == `${jobName} has not been run`) {
            return {};
        }
    }

    // Deal with token expired / currenty running errors
}

async function updateAllJobs() {
    let jobs = getJobs();
    const sucsessBadge = '<span class="badge bg-success">Passing</span>';
    const failBadge = '<span class="badge bg-danger">Failed</span>';
    const runningBadge = '<span class="visually-hidden">Running...</span>';
    const newBadge = '<span class="badge bg-info">New</span>';
    const template = document.querySelector('#job-card');
    const table = document.querySelector('#jobs-table');
    const children = table.children;
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
            case undefined:
                badge.innerHTML = newBadge;
                break;
            case 'finished':
                badge.innerHTML = sucsessBadge;
                break;
            case 'failed':
                badge.innerHTML = failBadge;
                break;
            case 'running':
                badge.innerHTML = runningBadge;
                break;
            default:
                break;
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
            
            for (let i = 0; i < 10; i++) {
                const segment = document.createElement('div');
                segment.classList.add('run');
                if (details.history && details.history[i]) {
                    if (details.history[i] == 'finished') {
                        segment.classList.add('good');
                    } else if (details.history[i] == 'failed') {
                        segment.classList.add('bad');
                    }
                }
                history.appendChild(segment);
            }

            let child = children[i];
            if (child) {
                child.replaceWith(card);
            } else {
                table.appendChild(card);
            }
        })();
    }
}

async function logout() {
    document.cookie = '';
    window.location.href = '/login';
}

async function cannotConnect(onConnected) {
    let toast = new bootstrap.Toast(document.querySelector('#net-error'), {autohide:false});
    toast.show();
    let canConnect = false;
    while (!canConnect) {
        await sleep(5000);

        try {
            let res = await fetch('/reachable.txt', {
                method: 'GET'
            });
            if (res.ok) {
                canConnect = true;
            }
        } catch (error) {
            console.log(error);
        } 
    }
    toast.hide();
    return onConnected();
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

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}