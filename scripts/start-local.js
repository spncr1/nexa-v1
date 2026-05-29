const { spawn } = require('node:child_process');
const path = require('node:path');

const port = process.env.PORT || '3000';
const nodemonBin = path.join(__dirname, '..', 'node_modules', '.bin', 'nodemon');

const child = spawn(nodemonBin, ['--no-update-notifier', 'server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
        ...process.env,
        PORT: port
    },
    stdio: 'inherit'
});

child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }

    process.exit(code || 0);
});
