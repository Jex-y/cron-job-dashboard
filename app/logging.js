const fs = require('fs');

const symbols = {
    'error' : '[X]',
    'warning': '[!]',
    'info': '[*]',
    'debug': '[?]'
};

const levels = ['error', 'warning', 'info', 'debug'];

const logdir = process.env.LOG_DIR;

let logfile = null;

function writeToLog(msg) {
    if (!logfile) {
        module.exports.initialize();
    }

    fs.appendFile(logfile, msg + '\n', (err) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
    });
}

module.exports.initialize = () => {
    if (!fs.existsSync(logdir)) {
        fs.mkdirSync(logdir);
    }

    let now = new Date();
    logfile = `${logdir}/${now.getFullYear()}-${now.getMonth()}-${now.getDay()}_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}.log`;
};


module.exports.log = (msg, level) => {
    level = level.toLowerCase();
    let log_level = process.env.LOG_LEVEL.toLowerCase();
    if (levels.indexOf(level) <= levels.indexOf(log_level)) {
        let symbol = symbols[level];
        let now = new Date();
        msg = `${now.toISOString()} | ${symbol} ${msg}`;
        if (level === 'error') {
            console.error(msg);
        } else {
            console.log(msg);
        }
        writeToLog(msg);
    }
};

for (const level of levels) {
    module.exports[level] = (msg) => {module.exports.log(msg, level);};
}

module.exports.logrequests = (err, req, res, next) => {
    console.log('Logging called');
    next();
    console.log('Logging called again');
    let msg = `${req.status}`;
    // module.exports.info()
    console.log(msg);
};