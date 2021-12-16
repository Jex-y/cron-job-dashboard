'use strict';

let loginForm = document.getElementById('login-form');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    loginForm.addEventListener('input', async (event) => {
        event.preventDefault();
        validateForm();
    });

    let valid = validateForm();
    if (valid) {
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
        }).catch(error => console.log('error', error));

        let ok = res.ok;
        res = JSON.parse(await res.text());
        // Error if could not connect to server
        // Also button to show password
        console.log(ok);
        if (!ok) {
            let submitError = document.getElementById('submit-error');

            if (submitError) {
                submitError.innerHTML = res.error;
            }
            else {
                submitError = document.createElement('div');
                document.getElementById('form-grid').appendChild(submitError);
                submitError.outerHTML =
                    '<div class="row text-center mb-0">' +
                    `<h6 class="text-danger mt-3 mb-0" id="submit-error">${res.error}</h6>` +
                    '</div>';
            }

        } else {
            document.cookie = res.token;
            window.location.href = '/app';
        }
    }
});

function validateForm() {
    let valid = true;
    let email = loginForm.email.value;
    let pass = loginForm.pass.value;

    if (!validateEmail(email)) {
        valid = false;
        document.getElementById('email-invalid').innerHTML = 'Please enter a valid email address.';
        loginForm.email.setCustomValidity('_');
    } else {
        loginForm.email.setCustomValidity('');
    }

    if (pass == '') {
        valid = false;
        document.getElementById('pass-invalid').innerHTML = 'Password cannot be empty';
        loginForm.pass.setCustomValidity('_');
    } else {
        loginForm.pass.setCustomValidity('');
    }

    loginForm.classList.add('was-validated');

    return valid;
}

const validateEmail = (email) => {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
};