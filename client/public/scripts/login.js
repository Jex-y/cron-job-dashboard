'use strict';

let loginForm = document.getElementById('login-form');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    loginForm.addEventListener('input', async (event) => {
        event.preventDefault();
        validateForm();
    });

    let valid = validateForm();
    let ok = false;
    let res = null;
    let serverError;

    if (valid) {
        try {
            res = await fetch('/login', {
                method: 'POST',
                headers: new Headers({
                    'Content-Type': 'application/x-www-form-urlencoded'
                }),
                body: new URLSearchParams({
                    email: loginForm.email.value,
                    pass: loginForm.pass.value
                }),
            });
            ok = res.ok;
            res = JSON.parse(await res.text());

            if (!ok) {
                serverError = res.error;
            }
        } catch (error) {
            console.log(error);
            serverError = 'Could not connect to the server';
        }
        if (!ok) {
            let submitError = document.getElementById('submit-error');

            if (submitError) {
                submitError.innerHTML = serverError;
            }
            else {
                submitError = document.createElement('div');
                document.getElementById('form-grid').appendChild(submitError);
                submitError.outerHTML =
                    '<div class="row text-center mb-0">' +
                    `<h6 class="text-danger mt-3 mb-0" id="submit-error">${serverError}</h6>` +
                    '</div>';
            }

        } else {
            document.cookie = `authorization=Bearer ${res.token};`;
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