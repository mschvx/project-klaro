document.addEventListener('DOMContentLoaded', function(){
    const summaryEl = document.getElementById('summary');
    const breakdownEl = document.getElementById('breakdown');
    const iterationsEl = document.getElementById('iterations');

    function fmt(v){
        if (v === null || v === undefined) return '-';
        if (typeof v === 'number') return Number.isInteger(v) ? v.toString() : v.toFixed(4);
        return String(v);
    }

    function renderBreakdown(breakdown){
        if (!breakdown || !Array.isArray(breakdown) || breakdown.length === 0) return;
        // Exclude entries where both units and cost are zero
        const filtered = breakdown.filter(item => {
            const units = Number(item.units || item[1] || 0);
            const cost = Number(item.cost || item[2] || 0);
            return !(units === 0 && cost === 0);
        });
        if (filtered.length === 0) return;
        const h = document.createElement('h3'); h.textContent = 'Breakdown';
        breakdownEl.appendChild(h);
    const table = document.createElement('table'); table.className = 'dataset-table results-table';
        const thead = document.createElement('thead');
        const trh = document.createElement('tr');
        ['Project','Units','Cost'].forEach(t => { const th = document.createElement('th'); th.textContent = t; trh.appendChild(th); });
        thead.appendChild(trh); table.appendChild(thead);
        const tbody = document.createElement('tbody');
        filtered.forEach(item => {
            const tr = document.createElement('tr');
            const name = document.createElement('td'); name.textContent = item.name || item[0] || '';
            name.style.textAlign='left';
            const units = document.createElement('td'); units.textContent = fmt(item.units || item[1] || 0);
            const cost = document.createElement('td'); cost.textContent = fmt(item.cost || item[2] || 0);
            tr.appendChild(name); tr.appendChild(units); tr.appendChild(cost);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        breakdownEl.appendChild(table);
    }

    function renderSimpleResult(result){
        if (!result) return;
        const h = document.createElement('h3'); h.textContent = 'Recommendation';
        summaryEl.appendChild(h);
        const p = document.createElement('p'); p.innerHTML = `<span class="kv">Recommended:</span> ${escapeHtml(result.recommended && result.recommended.name || '-')}`;
        summaryEl.appendChild(p);
        const t = document.createElement('p'); t.innerHTML = `<span class="kv">Total cost:</span> ${result.totals ? result.totals.totalCost : '-'} &nbsp; <span class="kv">Total CO2:</span> ${result.totals ? result.totals.totalCO2 : '-'}`;
        summaryEl.appendChild(t);
    }

    function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    function renderIteration(i, item){
        const div = document.createElement('div'); div.className='iteration';
    const phase = item.phase || item.ph || '';
        const step = item.step || item.st || '';
        const h = document.createElement('h3'); h.textContent = `Iteration ${i+1}` + (phase ? ` — ${phase}` : '') + (step ? ` (step ${step})` : '');
        div.appendChild(h);

        // tableau may be stored under several possible keys depending on how JSON was generated
        const tableau = item.tableau || item.tableau_body || item.tableauBody || item.table || null;
        const rowNames = item.row_names || item.rowNames || item.rowname || null;
        const colNames = item.col_names || item.colNames || item.col_name || null;

        if (tableau && Array.isArray(tableau)){
            const wrap = document.createElement('div'); wrap.className='table-wrap';
                const table = document.createElement('table'); table.className='dataset-table results-table';
            const thead = document.createElement('thead');
            const thr = document.createElement('tr');
            // header first cell blank for row names
            const hblank = document.createElement('th'); hblank.textContent = '';
            thr.appendChild(hblank);
            const cols = colNames && Array.isArray(colNames) ? colNames : ( (tableau[0] && Array.isArray(tableau[0])) ? tableau[0].map((_,c)=> 'c'+(c+1)) : [] );
            cols.forEach(cn => { const th = document.createElement('th'); th.textContent = cn; thr.appendChild(th); });
            thead.appendChild(thr); table.appendChild(thead);
            const tbody = document.createElement('tbody');
            for (let r=0;r<tableau.length;++r){
                const tr = document.createElement('tr');
                const rname = (rowNames && rowNames[r]) ? rowNames[r] : (`r${r+1}`);
                const th = document.createElement('th'); th.textContent = rname; tr.appendChild(th);
                const row = tableau[r];
                if (!Array.isArray(row)) continue;
                for (let c=0;c<row.length;++c){ const td = document.createElement('td'); td.textContent = fmt(row[c]); tr.appendChild(td); }
                tbody.appendChild(tr);
            }
            table.appendChild(tbody); wrap.appendChild(table); div.appendChild(wrap);
        } else {
            const p = document.createElement('p'); p.textContent = 'No tableau data for this iteration.'; div.appendChild(p);
        }

        iterationsEl.appendChild(div);
    }

    // Pagination state for iterations (show pages of 5 iterations)
    let allIterations = [];
    const pageSize = 5;
    let currentPage = 0;

    function renderPage(pageIndex){
        iterationsEl.innerHTML = '';
        if (!Array.isArray(allIterations) || allIterations.length === 0) return;
        const start = pageIndex * pageSize;
        const end = Math.min(start + pageSize, allIterations.length);
        for (let i = start; i < end; ++i){
            renderIteration(i, allIterations[i]);
        }
        currentPage = pageIndex;
        renderPaginationControls();
    }

    function renderPaginationControls(){
        const container = document.getElementById('paginationControls');
        if (!container) return;
        container.innerHTML = '';
        const total = Math.ceil(allIterations.length / pageSize);
        if (total <= 1) return;

        const prev = document.createElement('button'); prev.className='page-btn'; prev.textContent='Prev';
        prev.disabled = currentPage === 0;
        prev.addEventListener('click', () => { if (currentPage>0) renderPage(currentPage-1); });
        container.appendChild(prev);

        // show page numbers (1-based)
        for (let p=0;p<total;++p){
            const btn = document.createElement('button'); btn.className='page-btn'; btn.textContent = (p+1).toString();
            if (p === currentPage) btn.classList.add('active');
            btn.addEventListener('click', (e)=>{ renderPage(p); });
            container.appendChild(btn);
        }

        const next = document.createElement('button'); next.className='page-btn'; next.textContent='Next';
        next.disabled = currentPage === (total-1);
        next.addEventListener('click', () => { if (currentPage < total-1) renderPage(currentPage+1); });
        container.appendChild(next);
    }

    // main fetch
    (async function(){
        try {
            const resp = await fetch('/Data/ToSend.json?t='+Date.now(), { cache: 'no-store' });
            if (!resp.ok) { summaryEl.textContent = 'No results found.'; return; }
            const data = await resp.json();
            // raw JSON output removed per user request
            // prefer 'minimization' key (R output)
            const min = data.minimization || data.minimization || null;
            if (min && typeof min === 'object'){
                // minimization.Z, breakdown, iterations
                const Z = (min.Z !== undefined) ? min.Z : (min.z || null);
                // Prepare formatted cost text and show it in a modal above the page
                try {
                    if (Z !== null && Z !== undefined) {
                        const num = Number(Z);
                        const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
                        const msg = `<p class="results-cost">The cost of this optimal mitigation project is ${fmt}</p><p class="results-sub" style="margin-top:0.5rem;color:var(--muted);">Scroll below for more details about the solution</p>`;
                        // Show cost in the page header instead of an automatic modal.
                        // (Users found the modal intrusive; we prefer inline summary.)
                        const costEl = document.getElementById('resultsCost');
                        if (costEl) {
                            costEl.textContent = `The cost of this optimal mitigation project is ${fmt}`;
                        } else {
                            // final fallback: console log
                            console.info('Optimal cost:', fmt);
                        }
                    }
                } catch (e) { /* ignore formatting errors */ }
                // total cost shown in the RESULTS header; do not duplicate below
                renderBreakdown(min.breakdown || min.Breakdown || []);
                const its = min.iterations || [];
                if (its && its.length){
                    allIterations = its;
                    renderPage(0);
                }
                return;
            }

            // fallback: server may produce result or 'result' key (node fallback)
            if (data.result){ renderSimpleResult(data.result); }
            if (data.breakdown) renderBreakdown(data.breakdown);
            if (data.iterations && Array.isArray(data.iterations)){
                allIterations = data.iterations;
                renderPage(0);
            }

            // If none of the above, try to render top-level tableau
            if (data.tableau){
                const fake = { tableau: data.tableau, row_names: data.row_names || data.row_names, col_names: data.col_names || data.col_names };
                renderIteration(0, fake);
            }

        } catch (e){
            summaryEl.textContent = 'Error reading results: '+e.message;
        }
    })();

});
