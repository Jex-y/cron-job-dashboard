# Cron Job Dashboard
This project has an API that is intended to be called by you reccuring jobs when they start, finish or fail. This can be used for any type of recuring job, not just a cron job.

From this, the dashboard will then give you information about how often they run, if they have failed recently and how long they take to run.

The documentation for the project can be found [here](https://documenter.getpostman.com/view/8229563/UVXnHuZK).
An instance of the project is also hosted [here](http://app.edjex.net)

## Installation
After cloning the repo the package can be instlled with npm.
```
cd ../cron-job-dashboard
npm install
```
This should install all of the dependancies aswell.

## Getting Started
To start the project run:
```
npm start
```
When starting the project, it should display the host and port it is listening on.

### Hosting
Note that if you wish to view the project on another device to the one it is being hosted on, the you will need to set `SERVER_HOST=0.0.0.0` (or whatever the IP address of you machine is). By default it is only accessable from the local machine. 

## Example
If you were to write a cron job running `program`, to monitor it you would write:
```bash
BASE_URL="http://app.edjex.net/api/job/<Job Name>"
AUTH="Authorization: Bearer <token>"
curl -X POST ${BASE_URL}?action=start --header "${AUTH}" && \
(program && curl -X POST ${BASE_URL}?action=stop --header "${AUTH}") || \
curl -X POST ${BASE_URL}?action=fail --header "${AUTH}"
```
The API can be called from any language.

## Limmitations
Currently the job name has to be manually URL encoded. This could be resolved by writing a small program that is called with the job name and the action and makes the API call.

Users are not able to reset their password if they forget it. This would involve sending emails which would be more complexity.

The API and app are served over HTTP instead of HTTPS. Changing this would just be a matter of getting a cerfiticate.
