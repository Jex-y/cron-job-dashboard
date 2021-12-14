const fs = require('fs');
const logging = require('./logging');
let fileLock = false;

module.exports.getUser = async (email) => {
    logging.debug(`Getting user ${email} from database`);
    while (fileLock) { 'pass'; }
    fileLock = true;
    let data = await readJSON(this.datafile);
    let users = data.users;
    fileLock = false;
    let user = null;
    if (users) {
        for (let item of users) {
            if (item.email == email) {
                user = item;
                break;
            }
        }
    }
    if (user) {
        logging.debug(`Fetched ${JSON.stringify(user)} from database`);
    } else {
        logging.debug(`User ${email} does not exist in database`);
    }
    
    return user;
};

module.exports.addUser = async (name, email, password) => {
    while (fileLock) { 'pass'; }
    fileLock = true;
    let data = await readJSON(this.datafile);
    data.users.push({
        'name':name,
        'email':email,
        'pass':await password
    });
    writeJSON(this.datafile, data);
    fileLock = false;
};

module.exports.clear = async () => {
    writeJSON(this.datafile, {
        'users':[]
    });
};

async function readJSON(file) {
    let data = fs.readFileSync(file);
    return JSON.parse(data);
}

async function writeJSON(file, data) {
    data = JSON.stringify(data);
    fs.writeFileSync(file, data);
}

if (process.env.DB_MODE === 'DEBUG') {
    logging.debug('Initialising mock database');
    this.datafile = 'data/debug.json';
    this.clear();
} else {
    this.datafile = process.env.DB_DATAFILE;
}
