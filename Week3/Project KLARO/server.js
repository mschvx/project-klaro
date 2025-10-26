const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // Handle saving to ToReceive.json
    if (parsedUrl.pathname === '/save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const jsonPath = path.join(__dirname, 'Data', 'ToReceive.json');
            try {
                fs.writeFileSync(jsonPath, body);
            } catch (writeErr) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: writeErr.message }));
                return;
            }

            // Run the R script to produce Data/ToSend.json (blocks until finished)
            const { execFile } = require('child_process');

            // Helper to find Rscript on Windows (or use RSCRIPT_PATH env var)
            function findRscript() {
                // If user provided explicit path in env, prefer it
                if (process.env.RSCRIPT_PATH && require('fs').existsSync(process.env.RSCRIPT_PATH)) {
                    return process.env.RSCRIPT_PATH;
                }

                const fs = require('fs');
                const path = require('path');

                // Try listing Program Files\R\ directories and pick the newest-looking one
                const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
                const rBase = path.join(programFiles, 'R');
                if (fs.existsSync(rBase) && fs.statSync(rBase).isDirectory()) {
                    try {
                        const children = fs.readdirSync(rBase).filter(d => {
                            try { return fs.statSync(path.join(rBase, d)).isDirectory(); } catch(e){return false}
                        });
                        // prefer directories that start with R- (versioned installs)
                        children.sort().reverse();
                        for (const d of children) {
                            const cand1 = path.join(rBase, d, 'bin', 'Rscript.exe');
                            const cand2 = path.join(rBase, d, 'bin', 'x64', 'Rscript.exe');
                            if (fs.existsSync(cand1)) return cand1;
                            if (fs.existsSync(cand2)) return cand2;
                        }
                    } catch (e) {
                        // ignore and fallback
                    }
                }

                // Common alternate location
                const alt = path.join('C:', 'R', 'bin', 'Rscript.exe');
                if (fs.existsSync(alt)) return alt;

                // Finally, just return the bare command; it may work if in PATH on non-Windows
                return 'Rscript';
            }

            const rscriptPath = findRscript();

            // If we couldn't find Rscript binary and the returned value is the plain 'Rscript',
            // check quickly whether it exists in PATH by attempting to run it; we'll handle errors below.
            execFile(rscriptPath, ['R/Minimization.R'], { cwd: __dirname, windowsHide: true }, (err, stdout, stderr) => {
                if (err) {
                    console.error('Rscript error:', err, stderr);
                    // If Rscript isn't available, fall back to a JS-based tableau generator so UI still shows results
                    const tryPath = jsonPath; // ToReceive.json
                    try {
                        const recv = JSON.parse(fs.readFileSync(tryPath, 'utf8'));
                        // Build a similar transposed tableau: pollutants as rows, projects as columns
                        const cols = recv.columns || [];
                        const projects = recv.projects || [];
                        const pollutantNames = cols.slice(1);
                        const projectNames = projects.map(p => p.name || 'proj');
                        // Build numeric matrix
                        const tableauRows = [];
                        for (let i = 0; i < pollutantNames.length; ++i) {
                            const row = projects.map(p => {
                                const d = p.data || [];
                                const v = Array.isArray(d) ? d[i] : null;
                                return (v === undefined || v === null) ? null : Number(v);
                            });
                            row.push(0); // RHS
                            tableauRows.push(row);
                        }
                        // Objective row (costs)
                        const costRow = projects.map(p => {
                            const d = p.data || [];
                            const v = Array.isArray(d) ? d[0] : null;
                            return (v === undefined || v === null) ? null : Number(v);
                        });
                        costRow.push(0);
                        tableauRows.push(costRow);

                        const toSend = {
                            orientation: 'constraints_as_rows',
                            row_names: pollutantNames.concat(['Cost']),
                            col_names: projectNames.concat(['RHS']),
                            tableau: tableauRows,
                            diagnostics: ['Rscript failed; used Node fallback to build tableau.', String(stderr || err && err.message || '')],
                            note: 'Generated by server JS fallback because Rscript was unavailable.'
                        };
                        const outPath = path.join(__dirname, 'Data', 'ToSend.json');
                        // compute simple result and attach
                        const result = computeSimpleSolution(recv);
                        toSend.result = result;
                        fs.writeFileSync(outPath, JSON.stringify(toSend, null, 2));
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, fallback: true, message: 'Rscript failed; used JS fallback to generate ToSend.json' }));
                        return;
                    } catch (e2) {
                        let message = stderr || err.message || String(err);
                        if (err.code === 'ENOENT' || /not recognized/.test(message)) {
                            message = `Rscript not found. Please install R and ensure Rscript.exe is in PATH, or set RSCRIPT_PATH environment variable to the full path to Rscript.exe. Tried: ${rscriptPath}`;
                        }
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: message }));
                        return;
                    }
                }

                // R ran successfully; try to read Data/ToSend.json (written by R)
                try {
                    const outPath = path.join(__dirname, 'Data', 'ToSend.json');
                    if (fs.existsSync(outPath)) {
                        const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
                        // attach computed simple result for UI even if R produced tableau
                        const recv = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                        existing.result = computeSimpleSolution(recv);
                        fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
                    }
                } catch (e3) {
                    console.warn('Could not attach JS result to ToSend.json:', e3.message);
                }

                // Return success and any R output
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, output: stdout }));
            });
        });
        return;
    }
    
    // Serve static files
    let filePath = '.' + parsedUrl.pathname;
    if (filePath === './') filePath = './index.html';
    
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
    };
    
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if(error.code == 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error: '+error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Simple heuristic optimizer: cost-effectiveness by CO2 (cost / CO2)
function computeSimpleSolution(recv) {
    try {
        const projects = recv.projects || [];
        const list = projects.map(p => {
            const data = p.data || [];
            const cost = Number(data[0]) || 0;
            const co2 = Number(data[1]);
            const ratio = (co2 && co2 > 0) ? (cost / co2) : Number.POSITIVE_INFINITY;
            return { name: p.name || 'proj', cost, co2, ratio };
        });
        list.sort((a,b) => a.ratio - b.ratio);
        const best = list[0] || null;
        const selection = best ? [best.name] : [];
        const totals = selection.length ? { totalCost: best.cost, totalCO2: best.co2 } : { totalCost:0, totalCO2:0 };
        return { timestamp: new Date().toISOString(), ranking: list, recommended: best, selection, totals };
    } catch (e) {
        return { error: e.message };
    }
}


// Start server on a free port: prefer process.env.PORT then try 3000..3010
function startServer() {
    const preferred = process.env.PORT ? [Number(process.env.PORT)] : [];
    const range = Array.from({length: 11}, (_, i) => 3000 + i);
    const ports = preferred.concat(range.filter(p => !preferred.includes(p)));

    let idx = 0;
    const tryNext = () => {
        if (idx >= ports.length) {
            console.error('No available ports to bind server. Tried:', ports.join(', '));
            process.exit(1);
        }
        const p = ports[idx++];
        // attach one-time error listener before listen
        const onError = (err) => {
            server.removeListener('listening', onListen);
            if (err && err.code === 'EADDRINUSE') {
                console.warn(`Port ${p} in use, trying next port...`);
                // remove this error listener and try next
                server.removeListener('error', onError);
                tryNext();
            } else {
                console.error('Server error on listen:', err);
                process.exit(1);
            }
        };

        const onListen = () => {
            server.removeListener('error', onError);
            console.log(`Server running at http://localhost:${p}/`);
            console.log(`Open http://localhost:${p}/index.html`);
        };

        server.once('error', onError);
        server.once('listening', onListen);
        server.listen(p);
    };

    tryNext();
}

startServer();
