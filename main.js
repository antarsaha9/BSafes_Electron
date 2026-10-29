const { app, BrowserWindow, ipcMain, dialog, session } = require('electron')
const sqlite3 = require('sqlite3').verbose();
const path = require('node:path');
const fs = require('fs');
const handler = require('serve-handler');
const http = require('http');


const { dbAll, dbGet, dbRun } = require("./dbHelper.js")
const { fsGetS3Object, fsPutS3Object, fsIsS3ObjectExisted, dataFolderPath } = require("./s3Helper.js");
const { registerExportFolderHandlers } = require("./exportFolder.js");

var databaseFile = path.join(dataFolderPath, 'BSafes.db');

const createWindow = async (port) => {
    const win = new BrowserWindow({
        width: 800,
        heidht: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });
    await session.defaultSession.clearCache();
    win.webContents.openDevTools()
    //win.loadFile('hello.html');
    win.loadURL(`http://127.0.0.1:${port}`);
    //win.loadURL('http://localhost:8080/test/testQueryString.html');
}

const parseItemVersion = (row) => {
    let itemVersion;
    itemVersion = {
        id: row.id,
        version: row.version,
    }
    /*if (row.accumulatedAttachments) itemVersion.accumulatedAttachments = JSON.parse(row.accumulatedAttachments);
    if (row.accumulatedGalleryImages) itemVersion.accumulatedGalleryImages = JSON.parse(row.accumulatedGalleryImages);
    if (row.accumulatedS3ObjectsInContent) itemVersion.accumulatedS3ObjectsInContent = JSON.parse(row.accumulatedS3ObjectsInContent);
    if (row.attachments) itemVersion.attachments = JSON.parse(row.attachments);
    if (row.audios) itemVersion.audios = JSON.parse(row.audios);
    if (row.container) itemVersion.container = JSON.parse(row.container);
    if (row.content) itemVersion.content = JSON.parse(row.content);
    if (row.contentSize) itemVersion.contentSize = JSON.parse(row.contentSize);
    if (row.createdTime) itemVersion.createdTime = JSON.parse(row.createdTime);
    if (row.dbSize) itemVersion.dbSize = JSON.parse(row.dbSize);
    if (row.displayName) itemVersion.displayName = JSON.parse(row.displayName);
    if (row.envelopeIV) itemVersion.envelopeIV = JSON.parse(row.envelopeIV);
    if (row.images) itemVersion.images = JSON.parse(row.images);
    if (row.ivEnvelope) itemVersion.ivEnvelope = JSON.parse(row.ivEnvelope);
    if (row.ivEnvelopeIV) itemVersion.ivEnvelopeIV = JSON.parse(row.ivEnvelopeIV);
    if (row.keyEnvelope) itemVersion.keyEnvelope = JSON.parse(row.keyEnvelope);
    if (row.keyVersion) itemVersion.keyVersion = JSON.parse(row.keyVersion);
    if (row.masterId) itemVersion.masterId = JSON.parse(row.masterId);
    if (row.memberName) itemVersion.memberName = JSON.parse(row.memberName);
    if (row.originalContainer) itemVersion.originalContainer = JSON.parse(row.originalContainer);
    if (row.originalPosition) itemVersion.originalPosition = JSON.parse(row.originalPosition);
    if (row.owner) itemVersion.owner = JSON.parse(row.owner);
    if (row.pageDate) itemVersion.pageDate = JSON.parse(row.pageDate);
    if (row.pageNumber) itemVersion.pageNumber = JSON.parse(row.pageNumber);
    if (row.path) itemVersion.path = JSON.parse(row.path);
    if (row.position) itemVersion.position = JSON.parse(row.position);
    if (row.s3ObjectsInContent) itemVersion.s3ObjectsInContent = JSON.parse(row.s3ObjectsInContent);
    if (row.s3ObjectsSizeInContent) itemVersion.s3ObjectsSizeInContent = JSON.parse(row.s3ObjectsSizeInContent);
    if (row.signedContentUrl) itemVersion.signedContentUrl = JSON.parse(row.signedContentUrl);
    if (row.sizeVersions) itemVersion.sizeVersions = JSON.parse(row.sizeVersions);
    if (row.space) itemVersion.space = JSON.parse(row.space);
    if (row.tags) itemVersion.tags = JSON.parse(row.tags);
    if (row.tagsTokens) itemVersion.tagsTokens = JSON.parse(row.tagsTokens);
    if (row.title) itemVersion.title = JSON.parse(row.title);
    if (row.titleTokens) itemVersion.titleTokens = JSON.parse(row.titleTokens);
    if (row.totalItemVersions) itemVersion.totalItemVersions = JSON.parse(row.totalItemVersions);
    if (row.totalSize) itemVersion.totalSize = JSON.parse(row.totalSize);
    if (row.totalStorage) itemVersion.totalStorage = JSON.parse(row.totalStorage);
    if (row.type) itemVersion.type = JSON.parse(row.type);
    if (row.updateType) itemVersion.update = JSON.parse(row.updateType);
    if (row.updatedBy) itemVersion.updatedBy = JSON.parse(row.updatedBy);
    if (row.usage) itemVersion.usage = JSON.parse(row.usage);
    if (row.videos) itemVersion.videos = JSON.parse(row.videos);*/
    if (row.accumulatedAttachments) itemVersion.accumulatedAttachments = JSON.parse(row.accumulatedAttachments);
    if (row.accumulatedGalleryImages) itemVersion.accumulatedGalleryImages = JSON.parse(row.accumulatedGalleryImages);
    if (row.accumulatedS3ObjectsInContent) itemVersion.accumulatedS3ObjectsInContent = JSON.parse(row.accumulatedS3ObjectsInContent);
    if (row.attachments) itemVersion.attachments = JSON.parse(row.attachments);
    if (row.audios) itemVersion.audios = JSON.parse(row.audios);
    if (row.container) itemVersion.container = row.container;
    if (row.content) itemVersion.content = row.content;
    if (row.contentSize) itemVersion.contentSize = row.contentSize;
    if (row.createdTime) itemVersion.createdTime = row.createdTime;
    if (row.dbSize) itemVersion.dbSize = row.dbSize;
    if (row.displayName) itemVersion.displayName = row.displayName;
    if (row.envelopeIV) itemVersion.envelopeIV = row.envelopeIV;
    if (row.images) itemVersion.images = JSON.parse(row.images);
    if (row.ivEnvelope) itemVersion.ivEnvelope = row.ivEnvelope;
    if (row.ivEnvelopeIV) itemVersion.ivEnvelopeIV = row.ivEnvelopeIV;
    if (row.keyEnvelope) itemVersion.keyEnvelope = row.keyEnvelope;
    if (row.keyVersion) itemVersion.keyVersion = row.keyVersion;
    if (row.masterId) itemVersion.masterId = row.masterId;
    if (row.memberName) itemVersion.memberName = row.memberName;
    if (row.originalContainer) itemVersion.originalContainer = row.originalContainer;
    if (row.originalPosition) itemVersion.originalPosition = row.originalPosition;
    if (row.owner) itemVersion.owner = row.owner;
    if (row.pageDate) itemVersion.pageDate = row.pageDate;
    if (row.pageNumber) itemVersion.pageNumber = row.pageNumber;
    if (row.path) itemVersion.path = JSON.parse(row.path);
    if (row.position) itemVersion.position = row.position;
    if (row.s3ObjectsInContent) itemVersion.s3ObjectsInContent = JSON.parse(row.s3ObjectsInContent);
    if (row.s3ObjectsSizeInContent) itemVersion.s3ObjectsSizeInContent = row.s3ObjectsSizeInContent;
    if (row.signedContentUrl) itemVersion.signedContentUrl = row.signedContentUrl;
    if (row.space) itemVersion.space = row.space;
    if (row.tags) itemVersion.tags = JSON.parse(row.tags);
    if (row.tagsTokens) itemVersion.tagsTokens = JSON.parse(row.tagsTokens);
    if (row.title) itemVersion.title = row.title;
    if (row.titleTokens) itemVersion.titleTokens = JSON.parse(row.titleTokens);
    if (row.totalItemVersions) itemVersion.totalItemVersions = row.totalItemVersions;
    if (row.totalSize) itemVersion.totalSize = row.totalSize;
    if (row.totalStorage) itemVersion.totalStorage = row.totalStorage;
    if (row.type) itemVersion.type = row.type;
    if (row.updateType) itemVersion.update = row.updateType;
    if (row.updatedBy) itemVersion.updatedBy = row.updatedBy;
    if (row.usage) itemVersion.usage = JSON.parse(row.usage);
    if (row.videos) itemVersion.videos = JSON.parse(row.videos);
    return itemVersion;
}

const setup = () => {
    const setupDB = () => {
        fs.access(databaseFile, fs.F_OK, (err) => {
            if (err) {
                fs.closeSync(fs.openSync(databaseFile, 'w'));
            }
            //file exists
            let db = new sqlite3.Database(databaseFile, async (err) => {
                if (err) {
                    return console.error(err.message);
                }
                console.log('Connected to the BSafes SQlite database.');
                global.sqliteDB = db;
                let command;
                let response;

                const createItemKeysTable = async () => {
                    command = "CREATE TABLE IF NOT EXISTS itemKeys (" +
                        "memberId TEXT, key TEXT, downloaded INTEGER, PRIMARY KEY (memberId, key)); ";
                    response = await dbRun(db, command);
                    console.log("CREATE TABLE IF NOT EXISTS itemKeys: ", response);
                }
                const createItemVersionsTable = async () => {
                    command = "CREATE TABLE IF NOT EXISTS itemVersions (" +
                        "id TEXT, " +
                        "version INTEGER, " +
                        "accumulatedAttachments TEXT, " +
                        "accumulatedGalleryImages TEXT, " +
                        "accumulatedS3ObjectsInContent TEXT, " +
                        "attachments TEXT, " +
                        "audios TEXT, " +
                        "container TEXT, " +
                        "content TEXT, " +
                        "contentSize INTEGER, " +
                        "createdTime INTEGER, " +
                        "dbSize INTEGER, " +
                        "displayName TEXT, " +
                        "downloaded INTEGER, " +
                        "downloadFailed INTEGER, " +
                        "envelopeIV TEXT, " +
                        "images TEXT, " +
                        "ivEnvelope TEXT, " +
                        "ivEnvelopeIV TEXT, " +
                        "keyEnvelope TEXT, " +
                        "keyVersion INTEGER, " +
                        "masterId TEXT, " +
                        "memberName TEXT, " +
                        "originalContainer TEXT, " +
                        "originalPosition INTEGER, " +
                        "owner TEXT, " +
                        "pageDate TEXT, " +
                        "pageNumber INTEGER, " +
                        "path TEXT, " +
                        "position INTEGER, " +
                        "s3ObjectsInContent TEXT, " +
                        "s3ObjectsSizeInContent INTEGER, " +
                        "signedContentUrl TEXT, " +
                        "sizeVersions TEXT, " +
                        "space TEXT, " +
                        "tags TEXT, " +
                        "tagsTokens TEXT, " +
                        "title TEXT, " +
                        "titleTokens TEXT, " +
                        "totalItemVersions INTEGER, " +
                        "totalSize INTEGER, " +
                        "totalStorage INTEGER, " +
                        "type TEXT, " +
                        "updateType TEXT, " +
                        "updatedBy TEXT, " +
                        "usage TEXT, " +
                        "videos TEXT, " +
                        "PRIMARY KEY (id, version)" +
                        ");";
                    response = await dbRun(db, command);
                    console.log("CREATE TABLE IF NOT EXISTS itemVersions: ", response);
                }
                const createItemsTable = async () => {
                    command = "CREATE TABLE IF NOT EXISTS items (" +
                        "id TEXT PRIMARY KEY , " +
                        "version INTEGER, " +
                        "container TEXT, " +
                        "envelopeIV TEXT, " +
                        "ivEnvelope TEXT, " +
                        "ivEnvelopeIV TEXT, " +
                        "keyEnvelope TEXT, " +
                        "keyVersion INTEGER, " +
                        "pageDate TEXT, " +
                        "pageNumber INTEGER, " +
                        "position INTEGER, " +
                        "space TEXT, " +
                        "tags TEXT, " +
                        "tagsTokens TEXT, " +
                        "title TEXT, " +
                        "titleTokens TEXT, " +
                        "type TEXT" +
                        "); ";
                    response = await dbRun(db, command);
                    console.log("CREATE TABLE IF NOT EXISTS items: ", response);
                }
                const createMembersTable = async () => {
                    command = "CREATE TABLE IF NOT EXISTS members (" +
                        "authId TEXT PRIMARY KEY , " +
                        "memberId TEXT, " +
                        "currentKeyVersion INTEGER, " +
                        "displayName TEXT, " +
                        "privateKeyEnvelope TEXT, " +
                        "searchKeyEnvelope TEXT, " +
                        "searchIVEnvelope TEXT, " +
                        "publicKey TEXT, " +
                        "lastUpdatedTime INTEGER" +
                        "); ";
                    response = await dbRun(db, command);
                    console.log("CREATE TABLE IF NOT EXISTS members: ", response);
                }
                await createItemKeysTable();
                await createItemVersionsTable();
                await createItemsTable();
                await createMembersTable();
            });
            return db;
        });
    }
    const setupDesktopAPIs = (db) => {
        const addAMemberIfNotExists = async (event, authId, member) => {
            return new Promise(async (resolve, reject) => {
                db = global.sqliteDB;
                console.log("addAMember");
                let response = await dbGet(db, `SELECT * FROM members WHERE authId="${authId}"`);
                if (response.status === "ok" && !response.row) {
                    let command = `INSERT INTO members (authId, memberId, currentKeyVersion, displayName, privateKeyEnvelope, searchKeyEnvelope, searchIVEnvelope, publicKey, lastUpdatedTime) VALUES ("${authId}", "${member.memberId}", "${member.currentKeyVersion}", "${member.displayName}", '${member.privateKeyEnvelope}', '${member.searchKeyEnvelope}', '${member.searchIVEnvelope}', '${member.publicKey}', ${member.lastUpdatedTime});`
                    response = await dbRun(db, command);
                    resolve(response);
                } else {
                    resolve({ status: "ok" });
                }
            });
        }
        const addAnItemVersion = async (event, memberId, key, itemVersion) => {
            return new Promise(async (resolve, reject) => {
                db = global.sqliteDB;
                console.log("addAnItemVersion");
                const updateAnItem = () => {
                    return new Promise(async (resolve, reject) => {
                        const prepareInsertCommand = () => {
                            let command = "INSERT INTO items (";
                            command += "id, version";
                            if (itemVersion.container) command += ", container";
                            if (itemVersion.envelopeIV) command += ", envelopeIV";
                            if (itemVersion.ivEnvelope) command += ", ivEnvelope";
                            if (itemVersion.ivEnvelopeIV) command += ", ivEnvelopeIV";
                            if (itemVersion.keyEnvelope) command += ", keyEnvelope";
                            if (itemVersion.keyVersion) command += ", keyVersion";
                            if (itemVersion.pageDate) command += ", pageDate";
                            if (itemVersion.pageNumber) command += ", pageNumber";
                            if (itemVersion.position) command += ", position";
                            if (itemVersion.space) command += ", space";
                            if (itemVersion.tags) command += ", tags";
                            if (itemVersion.tagsTokens) command += ", tagsTokens";
                            if (itemVersion.title) command += ", title";
                            if (itemVersion.titleTokens) command += ", titleTokens";
                            if (itemVersion.type) command += ", type";

                            command += ") VALUES (";
                            command += `'${itemVersion.id}', ${itemVersion.version}`;
                            if (itemVersion.container) command += `, '${itemVersion.container}'`;
                            if (itemVersion.envelopeIV) command += `, '${itemVersion.envelopeIV}'`;
                            if (itemVersion.ivEnvelope) command += `, '${itemVersion.ivEnvelope}'`;
                            if (itemVersion.ivEnvelopeIV) command += `, '${itemVersion.ivEnvelopeIV}'`;
                            if (itemVersion.keyEnvelope) command += `, '${itemVersion.keyEnvelope}'`;
                            if (itemVersion.keyVersion) command += `, ${itemVersion.keyVersion}`;
                            if (itemVersion.pageDate) command += `, '${itemVersion.pageDate}'`;
                            if (itemVersion.pageNumber) command += `, ${itemVersion.pageNumber}`;
                            if (itemVersion.position) command += `, ${itemVersion.position}`;
                            if (itemVersion.space) command += `, '${itemVersion.space}'`;
                            if (itemVersion.tags) command += `, '${JSON.stringify(itemVersion.tags)}'`;
                            if (itemVersion.tagsTokens) command += `, '${JSON.stringify(itemVersion.tagsTokens)}'`;
                            if (itemVersion.title) command += `, '${itemVersion.title}'`;
                            if (itemVersion.titleTokens) command += `, '${JSON.stringify(itemVersion.titleTokens)}'`;
                            if (itemVersion.type) command += `, '${itemVersion.type}'`;
                            command += ")";
                            return command;
                        }
                        const preapreUpdateCommand = () => {
                            let command = "UPDATE items SET ";
                            command += `version = ${itemVersion.version}`;
                            if (itemVersion.container) command += `, container = '${itemVersion.container}'`;
                            if (itemVersion.envelopeIV) command += `, envelopeIV = '${itemVersion.envelopeIV}'`;
                            if (itemVersion.ivEnvelope) command += `, ivEnvelope = '${itemVersion.ivEnvelope}'`;
                            if (itemVersion.ivEnvelopeIV) command += `, ivEnvelopeIV = '${itemVersion.ivEnvelopeIV}'`;
                            if (itemVersion.keyEnvelope) command += `, keyEnvelope = '${itemVersion.keyEnvelope}'`;
                            if (itemVersion.keyVersion) command += `, keyVersion = ${itemVersion.keyVersion}`;
                            if (itemVersion.pageDate) command += `, pageDate = '${itemVersion.pageDate}'`;
                            if (itemVersion.pageNumber) command += `, pageNumber = ${itemVersion.pageNumber}`;
                            if (itemVersion.position) command += `, position = ${itemVersion.position}`;
                            if (itemVersion.space) command += `, space = '${itemVersion.space}'`;
                            if (itemVersion.tags) command += `, tags = '${JSON.stringify(itemVersion.tags)}'`;
                            if (itemVersion.tagsTokens) command += `, tagsTokens = '${JSON.stringify(itemVersion.tagsTokens)}'`;
                            if (itemVersion.title) command += `, title = '${itemVersion.title}'`;
                            if (itemVersion.titleTokens) command += `, titleTokens = '${JSON.stringify(itemVersion.titleTokens)}'`;
                            if (itemVersion.type) command += `, type = '${itemVersion.type}'`;
                            command += `WHERE id = '${itemVersion.id}'`;
                            return command;
                        }
                        let response = await dbGet(db, `SELECT * FROM items WHERE id="${itemVersion.id}"`)
                        let command;
                        if (response.status === "ok" && !response.row) {
                            command = prepareInsertCommand();
                            console.log("Add one new item.");
                        } else if (response.status === "ok") {
                            command = preapreUpdateCommand();
                            console.log("Update one item.");
                        } else {
                            resolve(response);
                            return;
                        }
                        response = await dbRun(db, command);
                        resolve(response);
                    });
                }
                const updateAnItemVersion = () => {
                    return new Promise(async (resolve, reject) => {
                        const prepareCommand = () => {
                            let command = "INSERT INTO itemVersions (";
                            command += "id, version, downloaded";
                            if (itemVersion.accumulatedAttachments) command += ", accumulatedAttachments";
                            if (itemVersion.accumulatedGalleryImages) command += ", accumulatedGalleryImages";
                            if (itemVersion.accumulatedS3ObjectsInContent) command += ", accumulatedS3ObjectsInContent";
                            if (itemVersion.attachments) command += ", attachments";
                            if (itemVersion.audios) command += ", audios";
                            if (itemVersion.container) command += ", container";
                            if (itemVersion.content) command += ", content";
                            if (itemVersion.contentSize) command += ", contentSize";
                            if (itemVersion.createdTime) command += ", createdTime";
                            if (itemVersion.dbSize) command += ", dbSize";
                            if (itemVersion.displayName) command += ", displayName";
                            if (itemVersion.envelopeIV) command += ", envelopeIV";
                            if (itemVersion.images) command += ", images";
                            if (itemVersion.ivEnvelope) command += ", ivEnvelope";
                            if (itemVersion.ivEnvelopeIV) command += ", ivEnvelopeIV";
                            if (itemVersion.keyEnvelope) command += ", keyEnvelope";
                            if (itemVersion.keyVersion) command += ", keyVersion";
                            if (itemVersion.masterId) command += ", masterId";
                            if (itemVersion.memberName) command += ", memberName";
                            if (itemVersion.originalContainer) command += ", originalContainer";
                            if (itemVersion.originalPosition) command += ", originalPosition";
                            if (itemVersion.owner) command += ", owner";
                            if (itemVersion.pageDate) command += ", pageDate";
                            if (itemVersion.pageNumber) command += ", pageNumber";
                            if (itemVersion.path) command += ", path";
                            if (itemVersion.position) command += ", position";
                            if (itemVersion.s3ObjectsInContent) command += ", s3ObjectsInContent";
                            if (itemVersion.s3ObjectsSizeInContent) command += ", s3ObjectsSizeInContent";
                            if (itemVersion.signedContentUrl) command += ", signedContentUrl";
                            if (itemVersion.sizeVersions) command += ", sizeVersions";
                            if (itemVersion.space) command += ", space";
                            if (itemVersion.tags) command += ", tags";
                            if (itemVersion.tagsTokens) command += ", tagsTokens";
                            if (itemVersion.title) command += ", title";
                            if (itemVersion.titleTokens) command += ", titleTokens";
                            if (itemVersion.totalItemVersions) command += ", totalItemVersions";
                            if (itemVersion.totalSize) command += ", totalSize";
                            if (itemVersion.totalStorage) command += ", totalStorage";
                            if (itemVersion.type) command += ", type";
                            if (itemVersion.update) command += ", updateType";
                            if (itemVersion.updatedBy) command += ", updatedBy";
                            if (itemVersion.usage) command += ", usage";
                            if (itemVersion.videos) command += ", videos";

                            command += ") VALUES (";
                            command += `'${itemVersion.id}', ${itemVersion.version}, 0`;

                            if (itemVersion.accumulatedAttachments) command += `, '${JSON.stringify(itemVersion.accumulatedAttachments)}'`;
                            if (itemVersion.accumulatedGalleryImages) command += `, '${JSON.stringify(itemVersion.accumulatedGalleryImages)}'`;
                            if (itemVersion.accumulatedS3ObjectsInContent) command += `, '${JSON.stringify(itemVersion.accumulatedS3ObjectsInContent)}'`;
                            if (itemVersion.attachments) command += `, '${JSON.stringify(itemVersion.attachments)}'`;
                            if (itemVersion.audios) command += `, '${JSON.stringify(itemVersion.audios)}'`;
                            if (itemVersion.container) command += `, '${itemVersion.container}'`;
                            if (itemVersion.content) command += `, '${itemVersion.content}'`;
                            if (itemVersion.contentSize) command += `, ${itemVersion.contentSize}`;
                            if (itemVersion.createdTime) command += `, ${itemVersion.createdTime}`;
                            if (itemVersion.dbSize) command += `, ${itemVersion.dbSize}`;
                            if (itemVersion.displayName) command += `, '${itemVersion.displayName}'`;
                            if (itemVersion.envelopeIV) command += `, '${itemVersion.envelopeIV}'`;
                            if (itemVersion.images) command += `, '${JSON.stringify(itemVersion.images)}'`;
                            if (itemVersion.ivEnvelope) command += `, '${itemVersion.ivEnvelope}'`;
                            if (itemVersion.ivEnvelopeIV) command += `, '${itemVersion.ivEnvelopeIV}'`;
                            if (itemVersion.keyEnvelope) command += `, '${itemVersion.keyEnvelope}'`;
                            if (itemVersion.keyVersion) command += `, ${itemVersion.keyVersion}`;
                            if (itemVersion.masterId) command += `, '${itemVersion.masterId}'`;
                            if (itemVersion.memberName) command += `, '${itemVersion.memberName}'`;
                            if (itemVersion.originalContainer) command += `, '${itemVersion.originalContainer}'`;
                            if (itemVersion.originalPosition) command += `, ${itemVersion.originalPosition}`;
                            if (itemVersion.owner) command += `, '${itemVersion.owner}'`;
                            if (itemVersion.pageDate) command += `, '${itemVersion.pageDate}'`;
                            if (itemVersion.pageNumber) command += `, ${itemVersion.pageNumber}`;
                            if (itemVersion.path) command += `, '${JSON.stringify(itemVersion.path)}'`;
                            if (itemVersion.position) command += `, ${itemVersion.position}`;
                            if (itemVersion.s3ObjectsInContent) command += `, '${JSON.stringify(itemVersion.s3ObjectsInContent)}'`;
                            if (itemVersion.s3ObjectsSizeInContent) command += `, ${itemVersion.s3ObjectsSizeInContent}`;
                            if (itemVersion.signedContentUrl) command += `, '${itemVersion.signedContentUrl}'`;
                            if (itemVersion.space) command += `, '${itemVersion.space}'`;
                            if (itemVersion.tags) command += `, '${JSON.stringify(itemVersion.tags)}'`;
                            if (itemVersion.tagsTokens) command += `, '${JSON.stringify(itemVersion.tagsTokens)}'`;
                            if (itemVersion.title) command += `, '${itemVersion.title}'`;
                            if (itemVersion.titleTokens) command += `, '${JSON.stringify(itemVersion.titleTokens)}'`;
                            if (itemVersion.totalItemVersions) command += `, ${itemVersion.totalItemVersions}`;
                            if (itemVersion.totalSize) command += `, ${itemVersion.totalSize}`;
                            if (itemVersion.totalStorage) command += `, ${itemVersion.totalStorage}`;
                            if (itemVersion.type) command += `, '${itemVersion.type}'`;
                            if (itemVersion.update) command += `, '${itemVersion.update}'`;
                            if (itemVersion.updatedBy) command += `, '${itemVersion.updatedBy}'`;
                            if (itemVersion.usage) command += `, '${JSON.stringify(itemVersion.usage)}'`;
                            if (itemVersion.videos) command += `, '${JSON.stringify(itemVersion.videos)}'`;
                            command += ")";
                            //console.log(command);
                            return command;
                        }
                        response = await dbGet(db, `SELECT * FROM itemVersions WHERE id="${itemVersion.id}" AND version=${itemVersion.version}`)
                        if (response.status === "ok" && !response.row) {
                            let command = prepareCommand();
                            let response = await dbRun(db, command);
                            if (response.status === "ok") {
                                response = await dbRun(db, `UPDATE itemKeys SET downloaded = 1 WHERE memberId = "${memberId}" AND key = "${key}"`)
                                if (response.status === "ok") {
                                    console.log("Added one itemVersion.")
                                    resolve(response);
                                } else {
                                    resolve({ status: "error", error: "Could not set downloaded = 1" });
                                }
                            } else {
                                resolve(response);
                            }
                        } else if (response.status === "ok") {
                            if (true) {
                                response = await dbRun(db, `UPDATE itemVersions SET container = '${itemVersion.container}', position = ${itemVersion.position} WHERE id = '${itemVersion.id}' AND version = ${itemVersion.version}`)
                                if (response.status === "ok") {
                                    response = await dbRun(db, `UPDATE itemKeys SET downloaded = 1 WHERE memberId = "${memberId}" AND key = "${key}"`)
                                    if (response.status === "ok") {
                                        console.log("Updated one itemVersion.")
                                        resolve(response);
                                    } else {
                                        resolve({ status: "error", error: "Could not set downloaded = 1" });
                                    }
                                } else {
                                    resolve({ status: "error", error: "Could not update a version." });
                                }
                            }
                            resolve({ status: "error", error: "The itemVersion already exists." });
                        } else {
                            resolve(response);
                        }
                    });
                }
                try {
                    let response;
                    response = await updateAnItem();
                    if (response.status !== "ok") {
                        resolve(response);
                        return;
                    }
                    response = await updateAnItemVersion();
                    if (response.status !== "ok") {
                        resolve(response);
                        return;
                    }
                    resolve(response);
                } catch (error) {
                    console.log("addAnItemVersion failed: ", error)
                    resolve({ status: "error", error });
                }
            });
        }
        const addItemKeys = async (event, itemList) => {
            return new Promise(async (resolve, reject) => {
                db = global.sqliteDB;
                console.log("addItemKeys");
                try {
                    for (let i = 0; i < itemList.numberOfItems; i++) {
                        let command;
                        const memberId = itemList.memberId;
                        let key = itemList.items[i];
                        command = `SELECT * FROM itemKeys WHERE memberId = "${memberId}" AND key="${key}"`
                        let response = await dbGet(db, command);
                        if (response.status === "ok") {
                            if (!response.row) {
                                command = `INSERT INTO itemKeys (memberId, key, downloaded) VALUES ("${memberId}", "${key}", 0);`
                                response = await dbRun(db, command);
                                if (response.status === "ok") {
                                    console.log("Added one item key.");
                                } else {
                                    console.log("INSERT INTO itemKeys failed: ", response.error);
                                }
                            }
                        }
                    }
                    resolve({ status: "ok" });
                } catch (error) {
                    resolve({ status: "error", error });
                }
            })
        }
        const failedDownloadingObjectsForAnItem = async (event, id, version) => {
            return new Promise(async (resolve, reject) => {
                db = global.sqliteDB;
                response = await dbRun(db, `UPDATE itemVersions SET downloadFailed = 1 WHERE id = "${id}" AND version = ${version}`);
                if (response.status === "ok") {
                    console.log("One item with all objects downloaded.")
                    resolve({ status: "ok" });
                } else {
                    console.log("finishedDownloadingObjectsForAnItem failed: ", response.error)
                    resolve({ status: "error" });
                }
            });
        }
        const finishedDownloadingObjectsForAnItem = async (event, id, version) => {
            return new Promise(async (resolve, reject) => {
                db = global.sqliteDB;
                response = await dbRun(db, `UPDATE itemVersions SET downloaded = 1 WHERE id = "${id}" AND version = ${version}`);
                if (response.status === "ok") {
                    console.log("One item with all objects downloaded.")
                    resolve({ status: "ok" });
                } else {
                    console.log("finishedDownloadingObjectsForAnItem failed: ", response.error)
                    resolve({ status: "error" });
                }
            });
        }
        const getAMmberByAuthId = async (event, authId) => {
            return new Promise(async (resolve, reject) => {
                db = global.sqliteDB;
                console.log("getAMmberByAuthId");
                let response = await dbGet(db, `SELECT * FROM members WHERE authId="${authId}"`);
                if (response.status === "ok" && response.row) {
                    resolve({ status: "ok", member: response.row });
                } else {
                    resolve(response);
                }
            });
        }
        const getAnItemForDownloadingObjects = async (event, workspace) => {
            return new Promise(async (resolve, reject) => {
                console.log("getAnItemForDownloadingObjects");
                db = global.sqliteDB;
                let currentLevel = 0;
                let containersInLevels = {
                    0: [workspace],
                };
                while (1) {
                    for (let i = 0; i < containersInLevels[currentLevel].length; i++) {
                        let currentContainer = containersInLevels[currentLevel][i];
                        let command = `SELECT * FROM itemVersions WHERE container = "${currentContainer}" AND downloaded = 0 ORDER BY position DESC`;
                        let response = await dbGet(db, command);
                        if (response.status === "ok" && response.row) {
                            let item = parseItemVersion(response.row);
                            console.log("Container - ", currentContainer);
                            console.log("Item - ", item.id);
                            resolve({ status: "ok", item });
                            return;
                        } else if (response.status === "ok") {
                            let command = `SELECT * FROM itemVersions WHERE container = "${currentContainer}" AND type IN ('B', 'F', 'N', 'D') ORDER BY position DESC`;
                            let response = await dbAll(db, command);
                            if (response.status === "ok" && response.rows && response.rows.length) {
                                const nextLevel = currentLevel + 1;
                                let containers = [];
                                for (let i = 0; i < response.rows.length; i++) {
                                    containers.push(response.rows[i].id);
                                }
                                if (containersInLevels[nextLevel]) {
                                    containersInLevels[nextLevel].push(containers);
                                } else {
                                    containersInLevels[nextLevel] = containers;
                                }
                            } else if (response.status === "error") {
                                resolve({ status: "error" });
                                return;
                            }
                        } else {
                            resolve(response);
                            return;
                        }
                    }
                    currentLevel++;

                    if (!containersInLevels[currentLevel]) {
                        console.log("The End");
                        break;
                    } else {
                        console.log(`Level ${currentLevel} containers - `);
                    }
                }
                resolve({ status: "ok" })
            });
        }
        const getAnItemKeyForDwonload = async (event, memberId) => {
            return new Promise(async (resolve, reject) => {
                db = global.sqliteDB;
                console.log("getAnItemKeyForDwonload");
                try {
                    let response = await dbGet(db, `SELECT * FROM itemKeys WHERE memberId = ${memberId}  AND downloaded = 0`);
                    if (response.status === "ok") {
                        if (response.row) {
                            resolve({ status: "ok", key: response.row.key })
                        } else {
                            resolve({ status: "ok" })
                        }
                    } else {
                        resolve({ status: "error", error: response.error })
                    }
                } catch (error) {
                    resolve({ status: "error", error });
                }
            });
        }
        const getItemKeysForDownload = async (event, memberId) => {
            return new Promise(async (resolve, reject) => {
                db = global.sqliteDB;
                console.log("getItemKeysForDownload");
                try {
                    let response = await dbAll(db, `SELECT * FROM itemKeys WHERE memberId = ${memberId}  AND downloaded = 0 LIMIT 10`);
                    if (response.status === "ok") {
                        if (response.rows) {
                            resolve({ status: "ok", keys: response.rows })
                        } else {
                            resolve({ status: "ok" })
                        }
                    } else {
                        resolve({ status: "error", error: response.error })
                    }
                } catch (error) {
                    resolve({ status: "error", error });
                }
            });
        }
        const getLastItemKey = async (event, memberId) => {
            return new Promise(async (resolve, reject) => {
                db = global.sqliteDB;
                console.log("getLastItemKey");
                try {
                    let response;
                    response = await dbGet(db, `SELECT * FROM itemKeys WHERE memberId = "${memberId}" ORDER BY key DESC`);
                    if (response.status === "ok") {
                        if (response.row) {
                            resolve({ status: "ok", key: response.row.key })
                        } else {
                            resolve({ status: "ok" })
                        }
                    } else {
                        resolve({ status: "error", error: response.error })
                    }
                } catch (error) {
                    resolve({ status: "error", error });
                }
            })
        }
        const getPageItem = async (event, payload) => {
            return new Promise(async (resolve, reject) => {
                db = global.sqliteDB;
                const itemId = payload.itemId;
                let version = payload.oldVersion;
                if (!version) {
                    let response = await dbGet(db, `SELECT version FROM items WHERE id = "${itemId}"`);
                    if (response.status !== "ok") {
                        resolve(response);
                        return;
                    }
                    if (!response.row) {
                        resolve({ status: "error", error: "Could not find the item." })
                        return;
                    }
                    version = response.row.version;
                }
                let response = await dbGet(db, `SELECT * FROM itemVersions WHERE id = "${itemId}" AND version = ${version}`);
                if (response.status === "ok" && response.row) {
                    let item = parseItemVersion(response.row);
                    resolve({ status: "ok", item });
                } else if (response.status === "ok") {
                    resolve({ status: "ok" });
                } else {
                    resolve(response);
                }
            });
        }
        const getS3Object = async (event, s3Key) => {
            return new Promise(async (resolve, reject) => {
                response = await fsGetS3Object(s3Key);
                resolve(response);
            });
        }
        const isS3ObjectExisted = async (event, s3Key) => {
            return new Promise(async (resolve, reject) => {
                response = await fsIsS3ObjectExisted(s3Key);
                resolve(response);
            });
        }
        const listItems = async (event, body) => {
            return new Promise(async (resolve, reject) => {
                db = global.sqliteDB;
                let total, hits = [], result;
                const container = body.container;
                const from = body.from;
                const size = body.size;
                // let response = await dbAll(db, `SELECT COUNT(*) FROM items WHERE container = '${JSON.stringify(container)}'`);
                let response = await dbAll(db, `SELECT COUNT(*) FROM items WHERE container = '${container}'`);
                if (response.status !== "ok") {
                    resolve(response);
                    return;
                }
                total = response.rows[0]['COUNT(*)'];
                //let command = `SELECT * FROM items WHERE container = '${JSON.stringify(container)}' ORDER BY position DESC LIMIT ${size}`;
                let command = `SELECT * FROM items WHERE container = '${container}' ORDER BY position DESC LIMIT ${size}`;
                if (from) {
                    command += ` OFFSET ${from}`;
                }
                response = await dbAll(db, command);
                if (response.status !== "ok") {
                    resolve(response);
                    return;
                }
                const rows = response.rows;
                const parseRows = () => {
                    for (let i = 0; i < rows.length; i++) {
                        let row = rows[i];
                        let item = {
                            id: row.id,
                            version: row.version,
                        }
                        if (row.container) item.container = row.container;
                        if (row.envelopeIV) item.envelopeIV = row.envelopeIV;
                        if (row.ivEnvelope) item.ivEnvelope = row.ivEnvelope;
                        if (row.ivEnvelopeIV) item.ivEnvelopeIV = row.ivEnvelopeIV;
                        if (row.keyEnvelope) item.keyEnvelope = row.keyEnvelope;
                        if (row.keyVersion) item.keyVersion = row.keyVersion;
                        if (row.pageDate) item.pageDate = row.pageDate;
                        if (row.pageNumber) item.pageNumber = row.pageNumber;
                        if (row.position) item.position = row.position;
                        if (row.space) item.space = row.space;
                        if (row.tags) item.tags = JSON.parse(row.tags);
                        if (row.tagsTokens) item.tagsTokens = JSON.parse(row.tagsTokens);
                        if (row.title) item.title = row.title;
                        if (row.titleTokens) item.titleTokens = JSON.parse(row.titleTokens);
                        if (row.type) item.type = row.type;
                        hits.push(item);
                    }
                }
                parseRows();
                result = { status: "ok", hits: { total, hits } }
                resolve(result);
            });
        }
        const putS3Object = async (event, s3Key, data) => {
            return new Promise(async (resolve, reject) => {
                response = await fsPutS3Object(s3Key, data);
                resolve(response);
            });
        }
        const updateMemberLastUpdatedTime = async (evemt, authId, lastUpdatedTime) => {
            return new Promise(async (resolve, reject) => {
                db = global.sqliteDB;
                console.log("updateMemberLastUpdatedTime");
                let command = `UPDATE members SET lastUpdatedTime=${lastUpdatedTime} WHERE authId="${authId}";`
                response = await dbRun(db, command);
                resolve(response);
            });
        }
        ipcMain.handle('ping', () => 'pong');
        ipcMain.handle('addAMemberIfNotExists', addAMemberIfNotExists);
        ipcMain.handle('addAnItemVersion', addAnItemVersion);
        ipcMain.handle('addItemKeys', addItemKeys);
        ipcMain.handle('failedDownloadingObjectsForAnItem', failedDownloadingObjectsForAnItem);
        ipcMain.handle('finishedDownloadingObjectsForAnItem', finishedDownloadingObjectsForAnItem);
        ipcMain.handle('getAMmberByAuthId', getAMmberByAuthId);
        ipcMain.handle('getAnItemForDownloadingObjects', getAnItemForDownloadingObjects);
        ipcMain.handle('getAnItemKeyForDwonload', getAnItemKeyForDwonload);
        ipcMain.handle('getItemKeysForDownload', getItemKeysForDownload);
        ipcMain.handle('getLastItemKey', getLastItemKey);
        ipcMain.handle('getPageItem', getPageItem);
        ipcMain.handle('getS3Object', getS3Object);
        ipcMain.handle('isS3ObjectExisted', isS3ObjectExisted);
        ipcMain.handle('listItems', listItems);
        ipcMain.handle('putS3Object', putS3Object);
        ipcMain.handle('updateMemberLastUpdatedTime', updateMemberLastUpdatedTime);
        registerExportFolderHandlers();
    }
    const setupLocalBackupDataFolder = () => {
        try {
            if (!fs.existsSync(dataFolderPath)) {
                fs.mkdirSync(dataFolderPath);
            }
        } catch (error) {
            console.log("Could not open local backup data folder.");
            return;
        }
    }
    setupLocalBackupDataFolder();
    const db = setupDB();
    setupDesktopAPIs(db);
}

app.whenReady().then(async () => {
    const useRemoteServer = false; // Set to true to use the remote server for development
    let port;
    if (useRemoteServer) {
        port = 3000;
        createWindow(port);
        setup();
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
        })
        return;
    }
    const server = http.createServer((request, response) => {
        // You pass two more arguments for config and middleware
        // More details here: https://github.com/vercel/serve-handler#options
        return handler(request, response, { public: path.join(__dirname, 'webAsset')});
    });

    port = 5200;
    let serverStarted = false;
    const startServer = (server, port) => {
        return new Promise((resolve, reject) => {
            try {
                server.listen(port);

                server.on('listening', () => {
                    if (true) {
                        console.log(`Server successfully running on port: ${server.address().port}`);
                        serverStarted = true;
                        resolve({ status: "ok" });
                    }
                });

                server.once('error', (err) => {
                    console.log(
                        'There was an error starting the server in the error listener:',
                        err
                    );
                    server.close();
                    resolve({ status: "error", error: err });
                });
            } catch (error) {
                console.log("Failed to start the server: ", error);
                resolve({ status: "error", error: err });
            }
        });
    };

    while (port < 5300) {
        const response = await startServer(server, port);
        if (response.status === "ok") {
            createWindow(port);
            setup();
            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
            })
            break;
        } else {
            if (response.error.code === 'EADDRINUSE') {
                console.log(`Port ${port} is in use, trying port ${port + 1}...`);
                port++;
            } else {
                console.log("Failed to start the server: ", response.error);
                break;
            }
        }
    }

    if (!serverStarted) {
        console.error("Failed to start the server on any available port.");
        dialog.showErrorBox('Main Process Error', 'Failed to start the server on any available port. Please make sure ports 5200-5299 are available and restart the application.');
        app.quit();
    }
});

app.on('window-all-closed', () => {
    const db = global.sqliteDB;
    db.close();
    /*if (process.platform !== 'darwin')*/ app.quit();
})

