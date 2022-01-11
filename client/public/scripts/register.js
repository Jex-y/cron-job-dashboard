'use strict';

let registerForm = document.getElementById('register-form');

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    registerForm.addEventListener('input', async (event) => {
        event.preventDefault();
        validateForm();
    });

    let valid = validateForm();
    if (valid) {
        let res = await fetch('/register', {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'application/x-www-form-urlencoded'
            }),
            body: new URLSearchParams({
                name: registerForm.name.value,
                email: registerForm.email.value,
                pass: registerForm.pass.value
            }),
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
            document.cookie = `authorization=Bearer ${res.token};`;
            window.location.href = '/app';
        }
    }
});

function validateForm() {
    let valid = true;
    let email = registerForm.email.value;
    let pass = registerForm.pass.value;
    let confirmpass = registerForm.confirmpass.value;

    if (!validateEmail(email)) {
        valid = false;
        document.getElementById('email-invalid').innerHTML = 'Please enter a valid email address.';
        registerForm.email.setCustomValidity('_');
    } else {
        registerForm.email.setCustomValidity('');
    }

    if (pass == '') {
        valid = false;
        document.getElementById('pass-invalid').innerHTML = 'Password cannot be empty';
        registerForm.pass.setCustomValidity('_');
    }
    else if (pass.length < 8) {
        valid = false;
        document.getElementById('pass-invalid').innerHTML = 'Passwords must be at least 8 characters';
        registerForm.pass.setCustomValidity('_');
    }
    else if (pass != confirmpass) {
        valid = false;
        document.getElementById('pass-invalid').innerHTML = 'Passwords do not match';
        registerForm.pass.setCustomValidity('_');
    } else {
        registerForm.pass.setCustomValidity('');
    }

    registerForm.classList.add('was-validated');

    return valid;
}

const validateEmail = (email) => {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
};