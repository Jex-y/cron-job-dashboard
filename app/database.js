const fs = require('fs');
const uuid = require('uuid');
const logging = require('./logging');

module.exports = class Database {
    constructor(datafile) {
        this.datafile = datafile;
        this.fileLock = false;
    }

    async getUserByEmail(email) {
        return await this.getFromTable('users', (item) => item.email == email);
    }

    async getUserByID(id) {
        return await this.getFromTable('users', (item) => item.id == id);
    }

    async addUser(name, email, password) {
        let id = uuid.v4();
        await this.addRecord('users', {
            name: name,
            email: email,
            pass: await password,
            id: id
        });
        return id;
    }

    async getJobsByUser(userID) {
        return await this.getFromTable('jobs', (item) => item.user == userID, true);
    }

    async getUserJob(userID, jobName) {
        return await this.getFromTable(
            'jobs',
            (item) => item.user == userID && item.name == jobName
        );
    }

    async addJob(userID, jobName) {
        return await this.addRecord('jobs', {
            user: userID,
            name: jobName,
        });
    }

    async startRun(userID, jobName) {
        let start = (new Date()).toISOString();
        await this.addRecord('runs', {
            user: userID,
            name: jobName,
            start: start,
            finish: null,
            status: 'running',
        });
        return start;
    }

    async endRun(userID, jobName, start) {
        return await this.updateFields(
            'runs',
            (item) => item.user == userID && item.name == jobName && item.start == start,
            {
                finish: (new Date()).toISOString(),
                status: 'finished'
            });
    }

    async failRun(userID, jobName, start) {
        return await this.updateFields(
            'runs',
            (item) => item.user == userID && item.name == jobName && item.start == start,
            {
                finish: (new Date()).toISOString(),
                status: 'failed'
            });
    }

    async getRuns(userID, jobName) {
        return await this.getFromTable(
            'runs',
            (item) => item.user == userID && item.name == jobName,
            true
        );
    }

    async getLastRun(userID, jobName) {
        let runs = await this.getRuns(userID, jobName);
        let latest = runs[0];
        for (let i = 1; i < runs.length; i++) {
            if (runs[i].start > latest.start) {
                latest = runs[i];
            }
        }
        return latest;
    }

    async clear() {
        return await writeJSON(this.datafile, {
            users: [],
            jobs: [],
            runs: []
        });
    }

    async detele() {
        await this.getFileLock();
        fs.rmSync(this.datafile);
    }

    async getFileLock() {
        let start = Date.now();
        while (this.fileLock && Date.now() - start < process.env.DB_TIMEOUT) {
            'pass';
        }
        if (this.fileLock) {
            throw {
                name: 'DBTimeoutError',
                message: 'Database waited too long for file lock.',
            };
        }
    }

    async getFromTable(table, check, multiple = false) {
        await this.getFileLock();
        this.fileLock = true;
        let data = (await readJSON(this.datafile))[table];
        this.fileLock = false;
        let result = multiple ? [] : null;
        if (data) {
            for (let item of data) {
                if (check(item)) {
                    if (multiple) {
                        result.push(item);
                    } else {
                        result = item;
                        break;
                    }
                }
            }
        }
        return result;
    }

    async updateFields(table, check, values, multiple = false) {
        await this.getFileLock();
        this.fileLock = true;
        let data = await readJSON(this.datafile);
        // Error here somewhere when finishing job.
        if (data) {
            for (let i = 0; i < data[table].length; i++) {
                if (check(data[table][i])) {
                    for (let field in values) {
                        data[table][i][field] = values[field];
                    }
                    if (!multiple) { break; }
                }
            }
        }
        this.fileLock = false;
        writeJSON(this.datafile, data);
    }

    async addRecord(table, item) {
        await this.getFileLock();
        this.fileLock = true;
        let data = await readJSON(this.datafile);
        if (!data[table]) {
            data[table] = [];
        }
        data[table].push(item);
        await writeJSON(this.datafile, data);
        this.fileLock = false;
    }
};

async function readJSON(file) {
    let data = null;
    try {
        data = fs.readFileSync(file);
        data = JSON.parse(data);
    } catch (error) {
        logging.error(error);
    }
    return data;
}

async function writeJSON(file, data) {
    data = JSON.stringify(data);
    try {
        fs.writeFileSync(file, data);
    } catch (error) {
        logging.error(error);
    }
}
