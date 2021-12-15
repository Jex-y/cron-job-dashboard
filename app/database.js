const fs = require('fs');
const uuid = require('uuid');
const logging = require('./logging');
let fileLock = false;
let datafile = null;

module.exports.getUserByEmail = async (email) => 
    await getFromTable('users', (item) => item.email == email);

module.exports.getUserByID = async (id) => 
    await getFromTable('users', (item) => item.id == id);

module.exports.addUser = async (name, email, password) => await addRecord('users', 
    {
        'name':name,
        'email':email,
        'pass':await password,
        'id':uuid.v4()
    });

module.exports.getJobsByUser = async (userID) => 
    getFromTable('jobs', (item) => item.userID == userID);

module.exports.getUserJob = async (userID, jobName) => 
    getFromTable('jobs', (item) => (item.userID == userID) && (item.jobName == jobName));

module.exports.addJob = async (name, userID) => 
    addRecord('jobs', 
        {
            name: name, 
            description:'',
            user: userID
        });

module.exports.addRun = async (name, userID, start, finish, status) => 
    addRecord('runs', {
        user: userID,
        name:name,
        start:start,
        finish:finish,
        status:status
    });
    
module.exports.clear = async () =>
    writeJSON(datafile, {
        'users':[]
    });

async function getFromTable(table, check) {
    while (fileLock) { 'pass'; }
    fileLock = true;
    let data = (await readJSON(datafile))[table];
    fileLock = false;
    let result = null;
    if (data) {
        for (let item of data) {
            if (check(item)) {
                result = item;
                break;
            }
        }
    }
    return result;   
}

async function updateField(table, check, field, newValue) {
    while (fileLock) { 'pass'; }
    fileLock = true;
    let data = await readJSON(datafile);
    let found = false;
    let index = 0;
    if (data) {
        for (let item of data[table]) {
            if (check(item)) {
                found = true;
                break;
            }
            index ++;
        }
    }
    if (found) {
        data[table][index][field] = newValue;    
    }
    fileLock = false;
    writeJSON(datafile, data);
    return found;
}

async function addRecord(table, item) {
    while (fileLock) { 'pass'; }
    fileLock = true;
    let data = await readJSON(datafile);
    data[table].push(item);
    await writeJSON(datafile, data);
    fileLock = false;
}

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
    datafile = 'data/testdb.json';
    this.clear();
} else {
    datafile = process.env.DB_DATAFILE;
}
