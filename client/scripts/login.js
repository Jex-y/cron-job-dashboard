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
        var myHeaders = new Headers();
        myHeaders.append('Content-Type', 'application/x-www-form-urlencoded');

        var urlencoded = new URLSearchParams();
        urlencoded.append('email', 'edwardjex@live.co.uk');
        urlencoded.append('pass', 'password');

        var requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: urlencoded,
            redirect: 'follow'
        };

        let response = await fetch('/auth', requestOptions)
            .then(async res => JSON.parse(await res.text()))
            .catch(error => console.log('error', error));

        if (!response.ok) {
            let submitError = document.getElementById('submit-error');
            
            if (submitError) {
                submitError.innerHTML = response.error;   
            }
            else {
                submitError = document.createElement('div');
                document.getElementById('form-grid').appendChild(submitError);
                submitError.outerHTML = 
                    '<div class="row text-center mb-0">'+
                        `<h6 class="text-danger mt-3 mb-0" id="submit-error">${response.error}</h6>`+
                    '</div>';
            } 
         
        }

        // TODO: add token to cookie
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
    } else if (pass.length < 8) {
        valid = false;
        document.getElementById('pass-invalid').innerHTML = 'Password length must be at least 8 characters.';
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