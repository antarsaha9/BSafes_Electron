const { app, dialog, ipcMain, shell, BrowserWindow } = require('electron')
const fs = require('fs');
const fsp = fs.promises;
const path = require('node:path');
const crypto = require('crypto');
const { pathToFileURL } = require('node:url');
const { execFile, spawn } = require('node:child_process');

// Folders the user picked with chooseBackupFolder. Persisted so a remembered folder can be reused after a restart.
const approvedFile = () => path.join(app.getPath('userData'), 'backupFolders.json');
let approvedPromise = null; // Promise<Set of resolved folder paths>

const loadApproved = () => {
    if (!approvedPromise) {
        approvedPromise = fsp.readFile(approvedFile(), 'utf8')
            .then((text) => new Set(JSON.parse(text)))
            .catch(() => new Set());
    }
    return approvedPromise;
}

const approve = async (folder) => {
    const set = await loadApproved();
    set.add(path.resolve(folder));
    await fsp.writeFile(approvedFile(), JSON.stringify([...set]));
}

const isApproved = async (folder) => {
    if (typeof folder !== 'string' || !folder) return false;
    return (await loadApproved()).has(path.resolve(folder));
}

const ok = (extra = {}) => ({ status: 'ok', ...extra });
const fail = (error, code) => ({ status: 'error', error: String((error && error.message) || error), ...(code ? { code } : {}) });

const isInside = (parent, child) => child === parent || child.startsWith(parent + path.sep);

// Returns the full path of relPath inside rootPath, or throws if it would land outside the approved folder.
// allowRoot: an empty relPath (or '.') means the folder itself.
// followTarget: the entry is read through, so its own real path (not just its parent's) must be inside; throws ENOENT if missing.
// allowPartial: relPath may name a .partial file.
const resolveInside = async (rootPath, relPath, { createParents = false, allowRoot = false, followTarget = false, allowPartial = false } = {}) => {
    if (!(await isApproved(rootPath))) throw new Error('This folder was not chosen by the user.');
    const root = path.resolve(rootPath);
    if (allowRoot && (relPath === '' || relPath === '.')) {
        await fsp.realpath(root);
        return root;
    }
    if (typeof relPath !== 'string' || !relPath || relPath.includes('\0') || path.isAbsolute(relPath) || (!allowPartial && relPath.endsWith('.partial'))) {
        throw new Error('Invalid file path.');
    }
    const full = path.resolve(root, relPath);
    if (!full.startsWith(root + path.sep)) throw new Error('Path is outside the backup folder.');
    const parent = path.dirname(full);
    if (createParents) await fsp.mkdir(parent, { recursive: true });
    // Block symlinks that point outside the folder.
    const realRoot = await fsp.realpath(root);
    const realParent = await fsp.realpath(parent);
    if (!isInside(realRoot, realParent)) throw new Error('Path is outside the backup folder.');
    if (followTarget && !isInside(realRoot, await fsp.realpath(full))) throw new Error('Path is outside the backup folder.');
    return full;
}

const failWithCode = (error) => (error && error.code === 'ENOENT' ? fail('File not found', 'ENOENT') : fail(error));

const toBuffer = (data) => {
    if (!ArrayBuffer.isView(data)) throw new Error('File data must be a Uint8Array.');
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
}

// Files being written in pieces: fileId -> { stream, hash, size, full, partial, pending, error, sender }
const openFiles = new Map();
const watchedSenders = new WeakSet();

const waitForClose = (stream) => new Promise((resolve) => {
    if (stream.closed) return resolve();
    stream.once('close', resolve);
});

const abortFile = async (fileId) => {
    const file = openFiles.get(fileId);
    if (!file) return;
    openFiles.delete(fileId);
    file.stream.destroy();
    await waitForClose(file.stream);
    await fsp.rm(file.partial, { force: true }).catch(() => {});
}

const abortFilesOf = (sender) => {
    for (const [fileId, file] of openFiles) {
        if (file.sender === sender) abortFile(fileId);
    }
}

// Abort unfinished files when the page that started them closes or reloads.
const watchSender = (sender) => {
    if (watchedSenders.has(sender)) return;
    watchedSenders.add(sender);
    sender.once('destroyed', () => abortFilesOf(sender));
    sender.on('did-navigate', () => abortFilesOf(sender));
}

const getOpenFile = (event, fileId) => {
    const file = openFiles.get(fileId);
    if (!file || file.sender !== event.sender) throw new Error('Unknown file.');
    return file;
}

const chooseBackupFolder = async (event, options) => {
    try {
        const purpose = options && options.purpose;
        const win = BrowserWindow.fromWebContents(event.sender);
        const dialogOptions = {
            title: purpose === 'open' ? 'Open a BSafes backup' : 'Choose a folder for your backup',
            buttonLabel: purpose === 'open' ? 'Open' : 'Save backup here',
            properties: ['openDirectory', 'createDirectory'],
        };
        const result = win ? await dialog.showOpenDialog(win, dialogOptions) : await dialog.showOpenDialog(dialogOptions);
        if (result.canceled || !result.filePaths.length) return { status: 'cancelled' };
        const folder = path.resolve(result.filePaths[0]);
        await approve(folder);
        return ok({ path: folder, name: path.basename(folder) });
    } catch (error) {
        return fail(error);
    }
}

const checkBackupFolder = async (event, folder, options) => {
    try {
        const stat = await fsp.stat(folder);
        if (!stat.isDirectory()) return ok({ exists: false, writable: false });
        await fsp.access(folder, fs.constants.R_OK);
        let writable = false;
        try { await fsp.access(folder, fs.constants.W_OK); writable = true; } catch { }
        return ok({ exists: true, writable });
    } catch {
        return ok({ exists: false, writable: false });
    }
}

const writeBackupFile = async (event, rootPath, relPath, data) => {
    let partial;
    try {
        const full = await resolveInside(rootPath, relPath, { createParents: true });
        const buffer = toBuffer(data);
        partial = full + '.partial';
        await fsp.writeFile(partial, buffer);
        await fsp.rename(partial, full);
        return ok({ size: buffer.length, sha256: crypto.createHash('sha256').update(buffer).digest('hex') });
    } catch (error) {
        if (partial) await fsp.rm(partial, { force: true }).catch(() => {});
        return fail(error);
    }
}

const beginBackupFile = async (event, rootPath, relPath) => {
    try {
        const full = await resolveInside(rootPath, relPath, { createParents: true });
        const partial = full + '.partial';
        const stream = fs.createWriteStream(partial);
        const file = { stream, hash: crypto.createHash('sha256'), size: 0, full, partial, pending: Promise.resolve(), error: null, sender: event.sender };
        // A persistent listener, so a stream error never becomes an uncaught exception in the main process.
        stream.on('error', (err) => { if (!file.error) file.error = err; });
        await new Promise((resolve, reject) => {
            stream.once('open', resolve);
            stream.once('error', reject);
        });
        const fileId = crypto.randomUUID();
        openFiles.set(fileId, file);
        watchSender(event.sender);
        return ok({ fileId });
    } catch (error) {
        return fail(error);
    }
}

const appendBackupFile = async (event, fileId, data) => {
    try {
        const file = getOpenFile(event, fileId);
        const buffer = toBuffer(data);
        // Hash synchronously and chain the writes, so pieces always land in the order they were sent.
        file.hash.update(buffer);
        file.size += buffer.length;
        file.pending = file.pending.then(() => new Promise((resolve, reject) => {
            if (file.error) return reject(file.error);
            file.stream.write(buffer, (err) => (err ? reject(err) : resolve()));
        }));
        await file.pending;
        return ok();
    } catch (error) {
        return fail(error);
    }
}

const finishBackupFile = async (event, fileId) => {
    let file;
    try {
        file = getOpenFile(event, fileId);
    } catch (error) {
        return fail(error);
    }
    openFiles.delete(fileId);
    try {
        await file.pending;
        if (file.error) throw file.error;
        await new Promise((resolve, reject) => {
            file.stream.once('error', reject);
            file.stream.once('close', resolve);
            file.stream.end();
        });
        if (file.error) throw file.error;
        await fsp.rename(file.partial, file.full);
        return ok({ size: file.size, sha256: file.hash.digest('hex') });
    } catch (error) {
        file.stream.destroy();
        await waitForClose(file.stream);
        await fsp.rm(file.partial, { force: true }).catch(() => {});
        return fail(error);
    }
}

const abortBackupFile = async (event, fileId) => {
    const file = openFiles.get(fileId);
    if (file && file.sender === event.sender) await abortFile(fileId);
    return ok();
}

const readBackupFile = async (event, rootPath, relPath) => {
    try {
        const full = await resolveInside(rootPath, relPath, { followTarget: true });
        const buffer = await fsp.readFile(full);
        return ok({ data: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) });
    } catch (error) {
        return failWithCode(error);
    }
}

const hashBackupFile = async (event, rootPath, relPath, expectedSize) => {
    try {
        const full = await resolveInside(rootPath, relPath, { followTarget: true });
        const stat = await fsp.stat(full);
        if (!stat.isFile()) throw new Error('Not a file.');
        if (typeof expectedSize === 'number' && stat.size !== expectedSize) return ok({ size: stat.size, sha256: null });
        const hash = crypto.createHash('sha256');
        let size = 0;
        for await (const chunk of fs.createReadStream(full)) {
            hash.update(chunk);
            size += chunk.length;
        }
        return ok({ size, sha256: hash.digest('hex') });
    } catch (error) {
        return failWithCode(error);
    }
}

const listBackupFolder = async (event, rootPath, relPath) => {
    try {
        const full = await resolveInside(rootPath, relPath, { allowRoot: true, followTarget: true });
        const dirents = await fsp.readdir(full, { withFileTypes: true });
        return ok({ entries: dirents.map((dirent) => ({ name: dirent.name, isDirectory: dirent.isDirectory() })) });
    } catch (error) {
        return failWithCode(error);
    }
}

const removeBackupEntry = async (event, rootPath, relPath) => {
    try {
        // Not followTarget: removing a symlink deletes the link itself, never what it points to.
        const full = await resolveInside(rootPath, relPath, { allowPartial: true });
        await fsp.lstat(full);
        await fsp.rm(full, { recursive: true });
        return ok();
    } catch (error) {
        return failWithCode(error);
    }
}

const lstatOrNull = (full) => fsp.lstat(full).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
});

// Makes toRelPath a hard link to fromRelPath (the same file on disk), or a copy where hard links aren't supported.
const linkBackupFile = async (event, rootPath, fromRelPath, toRelPath) => {
    let partial;
    try {
        const from = await resolveInside(rootPath, fromRelPath, { followTarget: true });
        // Link to the real file: macOS link() follows a symlink and Linux doesn't.
        const realFrom = await fsp.realpath(from);
        const fromStat = await fsp.stat(realFrom);
        if (!fromStat.isFile()) throw new Error('Not a file.');
        const to = await resolveInside(rootPath, toRelPath, { createParents: true });
        const toStat = await lstatOrNull(to);
        // Already the same file. rename() onto another link of the same file does nothing, so it must be skipped.
        if (toStat && toStat.dev === fromStat.dev && toStat.ino === fromStat.ino) return ok({ linked: true });
        partial = to + '.partial';
        await fsp.rm(partial, { force: true });
        let linked = true;
        try {
            await fsp.link(realFrom, partial);
        } catch (error) {
            if (error.code === 'ENOENT') throw error;
            // For example FAT/exFAT drives, or NTFS's 1023-link limit. FICLONE is a free copy-on-write clone on APFS/Btrfs.
            linked = false;
            await fsp.copyFile(realFrom, partial, fs.constants.COPYFILE_FICLONE);
        }
        if (toStat && toStat.isDirectory()) await fsp.rm(to, { recursive: true });
        await fsp.rename(partial, to);
        return ok({ linked });
    } catch (error) {
        if (partial) await fsp.rm(partial, { force: true }).catch(() => {});
        return failWithCode(error);
    }
}

// Sets the Hidden attribute in Windows File Explorer. macOS and Linux already hide names starting with '.'.
const hideBackupEntry = async (event, rootPath, relPath) => {
    try {
        const full = await resolveInside(rootPath, relPath);
        await fsp.lstat(full);
        if (process.platform === 'win32') {
            const attrib = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'attrib.exe');
            await new Promise((resolve, reject) => execFile(attrib, ['+h', full], { windowsHide: true }, (err) => (err ? reject(err) : resolve())));
        }
        return ok();
    } catch (error) {
        return failWithCode(error);
    }
}

const showBackupFolder = async (event, folder) => {
    try {
        if (!(await isApproved(folder))) return fail('This folder was not chosen by the user.');
        const message = await shell.openPath(path.resolve(folder));
        return message ? fail(message) : ok();
    } catch (error) {
        return fail(error);
    }
}

// The default app for .html files may be an editor, so open the file with the app that handles https:// links,
// which is the user's default web browser. Falls back to the .html default app if that can't be found or started.
const openInDefaultBrowser = async (file) => {
    try {
        if (process.platform === 'darwin' || process.platform === 'win32') {
            const browser = await app.getApplicationInfoForProtocol('https://');
            if (browser && browser.path) {
                if (process.platform === 'darwin') {
                    await new Promise((resolve, reject) => execFile('open', ['-a', browser.path, file], (err) => (err ? reject(err) : resolve())));
                } else {
                    await new Promise((resolve, reject) => {
                        const child = spawn(browser.path, [file], { detached: true, stdio: 'ignore' });
                        child.once('error', reject);
                        child.once('spawn', () => { child.unref(); resolve(); });
                    });
                }
                return;
            }
        }
    } catch (error) {
        console.log('Could not open the backup with the default browser, using the default .html app instead:', error);
    }
    await shell.openExternal(pathToFileURL(file).href);
}

const openBackupInBrowser = async (event, rootPath) => {
    try {
        const full = await resolveInside(rootPath, 'index.html', { followTarget: true });
        if (!(await fsp.stat(full)).isFile()) return fail('File not found', 'ENOENT');
        await openInDefaultBrowser(full);
        return ok();
    } catch (error) {
        return failWithCode(error);
    }
}

const registerBackupFolderHandlers = () => {
    ipcMain.handle('backup:chooseFolder', chooseBackupFolder);
    ipcMain.handle('backup:checkFolder', checkBackupFolder);
    ipcMain.handle('backup:writeFile', writeBackupFile);
    ipcMain.handle('backup:beginFile', beginBackupFile);
    ipcMain.handle('backup:appendFile', appendBackupFile);
    ipcMain.handle('backup:finishFile', finishBackupFile);
    ipcMain.handle('backup:abortFile', abortBackupFile);
    ipcMain.handle('backup:readFile', readBackupFile);
    ipcMain.handle('backup:showFolder', showBackupFolder);
    ipcMain.handle('backup:hashFile', hashBackupFile);
    ipcMain.handle('backup:linkFile', linkBackupFile);
    ipcMain.handle('backup:hideEntry', hideBackupEntry);
    ipcMain.handle('backup:listFolder', listBackupFolder);
    ipcMain.handle('backup:removeEntry', removeBackupEntry);
    ipcMain.handle('backup:openInBrowser', openBackupInBrowser);

    // Don't leave .partial files behind when the app quits mid-export.
    app.on('before-quit', () => {
        for (const file of openFiles.values()) {
            file.stream.destroy();
            try { fs.rmSync(file.partial, { force: true }); } catch { }
        }
        openFiles.clear();
    });
}

module.exports = { registerBackupFolderHandlers };
