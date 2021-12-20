'use strict';

async function updateJobs() {
    let res = await fetch('/auth', {
        method: 'POST',
        headers: new Headers({
            'Content-Type': 'application/x-www-form-urlencoded'
        }),
        body: new URLSearchParams({
            email: loginForm.email.value,
            pass: loginForm.pass.value
        }),
        redirect: 'follow'
    }).catch(error => console.log('error', error));}

updateJobs();
setInterval(updateJobs(), 1000);