document.addEventListener('DOMContentLoaded', function(){
    const container = document.getElementById('resultsContainer');

    // tooltip element (re-uses catalogue tooltip styles from Styles/table.css)
    const tooltip = document.createElement('div');
    tooltip.className = 'catalogue-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.display = 'none';
    tooltip.style.pointerEvents = 'none';
    document.body.appendChild(tooltip);

    function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function fmt(v){ if (v === null || v === undefined) return '-'; if (typeof v === 'number') return Number.isInteger(v) ? v.toString() : v.toFixed(4); return String(v); }

    function showTooltipForCell(cell){
        if (!cell) return;
        const rect = cell.getBoundingClientRect();
        const table = cell.closest('table');

        // determine column index within the row
        const cells = Array.prototype.slice.call(cell.parentNode.children);
        const colIndex = cells.indexOf(cell);

        // header text (if present)
        let headerText = '';
        const thead = table && table.querySelector('thead');
        if (thead){
            const headerRow = thead.querySelector('tr');
            if (headerRow){
                const headers = Array.prototype.slice.call(headerRow.children);
                headerText = (headers[colIndex] && headers[colIndex].textContent) ? headers[colIndex].textContent.trim() : '';
            }
        }

        // row name: prefer TH in the row, otherwise first cell
        const row = cell.parentNode;
        const firstCell = row.querySelector('th') || row.children[0];
        const rowName = firstCell ? (firstCell.textContent || '').trim() : '';

        // content
        const value = cell.textContent ? cell.textContent.trim() : '';

        // build tooltip html
        let title = headerText || rowName || 'Value';
        let body = '';
        if (headerText && rowName) body = `<div class="ct-row"><span class="ct-label">${escapeHtml(rowName)}:</span> <span class="ct-value">${escapeHtml(fmt(value))}</span></div>`;
        else body = `<div class="ct-row"><span class="ct-value">${escapeHtml(fmt(value))}</span></div>`;

        tooltip.innerHTML = `<div class="ct-title">${escapeHtml(title)}</div>${body}`;
        tooltip.style.display = 'block';

        // position: prefer above cell; if not enough space, place below
        const padding = 10;
        // ensure tooltip has size
        const tW = tooltip.offsetWidth || 220;
        const tH = tooltip.offsetHeight || 60;
        let top = rect.top + window.scrollY - tH - 12;
        if (top < window.scrollY + 8) top = rect.bottom + window.scrollY + 12;
        let left = rect.left + window.scrollX;
        if (left + tW > window.scrollX + window.innerWidth - 8) left = window.scrollX + window.innerWidth - tW - 8;

        tooltip.style.top = top + 'px';
        tooltip.style.left = left + 'px';
    }

    function hideTooltip(){ tooltip.style.display = 'none'; }

    function enhanceTable(table){
        if (!table || table.dataset._enhanced) return;
        table.dataset._enhanced = '1';

        // Determine the very first row of the table (to avoid tooltips on it)
        const allRows = Array.prototype.slice.call(table.querySelectorAll('tr'));
        const firstRow = allRows.length ? allRows[0] : null;

        // Iterate rows and cells so we can skip the header row, the first row, and the first column
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            // skip header rows (THEAD) and explicitly the first row
            if (row.parentNode && row.parentNode.tagName === 'THEAD') return;
            if (firstRow && row === firstRow) return;

            const cells = Array.prototype.slice.call(row.children);
            cells.forEach(cell => {
                // skip first column (index 0)
                if (typeof cell.cellIndex === 'number' && cell.cellIndex === 0) return;

                // make interactive cells focusable and attach tooltip hover/focus
                if (!cell.hasAttribute('tabindex')) cell.setAttribute('tabindex', '0');
                cell.addEventListener('mouseenter', () => { cell.classList.add('is-hover'); showTooltipForCell(cell); });
                cell.addEventListener('mouseleave', () => { cell.classList.remove('is-hover'); hideTooltip(); });
                cell.addEventListener('focus', () => { cell.classList.add('is-hover'); showTooltipForCell(cell); });
                cell.addEventListener('blur', () => { cell.classList.remove('is-hover'); hideTooltip(); });
            });
        });
    }

    function scanAndEnhance(){
        if (!container) return;
        container.querySelectorAll('table.dataset-table').forEach(enhanceTable);
    }

    // observe for dynamic additions (results.js injects tables after fetch)
    if (container){
        const mo = new MutationObserver((mutations)=>{
            let found = false;
            for (const m of mutations){
                if (m.addedNodes && m.addedNodes.length) { found = true; break; }
            }
            if (found) scanAndEnhance();
        });
        mo.observe(container, { childList:true, subtree:true });
    }

    // initial pass in case tables already present
    scanAndEnhance();

    // small enhancement: make pagination buttons keyboard-friendly by adding visible focus outline
    const pag = document.getElementById('paginationControls');
    if (pag){
        pag.querySelectorAll('button').forEach(b => { b.tabIndex = 0; });
    }

    // --- Basic Solution generator ---
    function generateBasicSolutionForIteration(iterationDiv){
        if (!iterationDiv || iterationDiv.dataset._basicSolution) return;
        // find the first tableau inside this iteration (a table.results-table)
        const tableau = iterationDiv.querySelector('table.results-table');
        if (!tableau) return;

        // look at tbody rows: row header (th) or first cell is the variable name; last td is RHS
        const tbody = tableau.querySelector('tbody');
        if (!tbody) return;

        const rows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
        if (!rows.length) return;

        // create basic solution container
        const wrap = document.createElement('div'); wrap.className = 'basic-solution-wrap';
        const h = document.createElement('h4'); h.textContent = 'Basic solution';
        h.style.margin = '0.6rem 0 0.5rem';
        wrap.appendChild(h);

        const table = document.createElement('table'); table.className = 'dataset-table basic-solution-table';
        const thead = document.createElement('thead');
        const thr = document.createElement('tr');
        ['Variable', 'Value'].forEach(t => { const th = document.createElement('th'); th.textContent = t; thr.appendChild(th); });
        thead.appendChild(thr); table.appendChild(thead);
        const tb = document.createElement('tbody');

        rows.forEach(r => {
            // Skip if row is empty
            const cells = Array.prototype.slice.call(r.children);
            if (!cells.length) return;
            // variable name prefer TH else first cell
            let varName = '';
            const th = r.querySelector('th');
            if (th) varName = th.textContent.trim(); else varName = cells[0].textContent.trim();

            // value is the last cell (td)
            const last = cells[cells.length-1];
            if (!last) return;
            const val = last.textContent.trim();

            const tr = document.createElement('tr');
            const tdv = document.createElement('td'); tdv.textContent = varName; tdv.style.textAlign = 'left';
            const tdval = document.createElement('td'); tdval.textContent = val; tdval.style.textAlign = 'right';
            tr.appendChild(tdv); tr.appendChild(tdval); tb.appendChild(tr);
        });

        table.appendChild(tb); wrap.appendChild(table);

        // append after the tableau wrapper if present
        const tableWrap = iterationDiv.querySelector('.table-wrap');
        if (tableWrap) tableWrap.parentNode.insertBefore(wrap, tableWrap.nextSibling);
        else iterationDiv.appendChild(wrap);

        iterationDiv.dataset._basicSolution = '1';
    }

    // After enhancements or mutations, also generate basic solution for any iteration blocks
    function scanAndAddBasicSolutions(){
        const iters = container ? container.querySelectorAll('.iteration') : [];
        Array.prototype.forEach.call(iters, (it) => generateBasicSolutionForIteration(it));
    }

    // Call once after initial scan
    scanAndAddBasicSolutions();

    // Hook mutation observer to add basic solution when iterations are appended
    if (container){
        const mo2 = new MutationObserver((mutations)=>{
            for (const m of mutations){
                if (!m.addedNodes) continue;
                m.addedNodes.forEach(n => {
                    if (n.nodeType !== 1) return;
                    if (n.classList && n.classList.contains('iteration')){
                        generateBasicSolutionForIteration(n);
                    } else {
                        // if a subtree containing iteration was added, find them
                        const it = n.querySelector && n.querySelectorAll ? n.querySelectorAll('.iteration') : [];
                        Array.prototype.forEach.call(it, generateBasicSolutionForIteration);
                    }
                });
            }
        });
        mo2.observe(container, { childList:true, subtree:true });
    }
});
