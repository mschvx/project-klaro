// Catalogue tooltips: show Project / Metric / Value on hover for numeric cells
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    const tables = Array.from(document.querySelectorAll('.dataset-table'));
    if(tables.length === 0) return;

    tables.forEach(table => {
      // build header list from thead or first row for this table
      const headers = Array.from(table.querySelectorAll('thead th')).map(h => h.textContent.trim());
      // If there's no <thead>, fallback to first tr as header row
      if(headers.length === 0){
        const first = table.querySelector('tr');
        if(first){
          const ths = Array.from(first.querySelectorAll('th,td'));
          for(let i=0;i<ths.length;i++) headers.push(ths[i].textContent.trim());
        }
      }

    // Helper: create tooltip element
    let tip = null;
    function createTip(){
      tip = document.createElement('div');
      tip.className = 'catalogue-tooltip';
      tip.style.position = 'fixed';
      tip.style.pointerEvents = 'none';
      tip.style.opacity = '0';
      tip.style.transition = 'opacity 120ms ease';
      document.body.appendChild(tip);
    }

    function showTip(html, x, y){
      if(!tip) createTip();
      tip.innerHTML = html;
      // position with small offset
      const pad = 12;
      const rect = tip.getBoundingClientRect();
      let left = x + pad;
      let top = y + pad;
      // if overflow right, place to left
      if(left + rect.width > window.innerWidth - 8) left = x - rect.width - pad;
      if(top + rect.height > window.innerHeight - 8) top = y - rect.height - pad;
      tip.style.left = Math.max(6, left) + 'px';
      tip.style.top = Math.max(6, top) + 'px';
      tip.style.opacity = '1';
    }
    function hideTip(){ if(tip) tip.style.opacity = '0'; }

      // Attach listeners to numeric cells: skip first column (index) and project name column
      const rows = Array.from(table.querySelectorAll('tr'));
      // Determine which column is the project/name column by header match or heuristics
      let projectCol = headers.findIndex(h => /mitigation project|mitigation|project|options|pollutant/i.test(h));
      if(projectCol === -1){
        // heuristic: find first column where most cells are non-numeric
        const dataRows = table.querySelectorAll('tbody tr');
        const iterateRows = dataRows.length ? Array.from(dataRows) : rows.slice(1);
        const colCounts = [];
        iterateRows.forEach(r => {
          const cells = Array.from(r.querySelectorAll('td'));
          cells.forEach((c, ci) => {
            const text = c.textContent.trim().replace(/,/g,'');
            const numeric = /^-?\d+(?:\.\d+)?$/.test(text);
            colCounts[ci] = colCounts[ci] || {num:0, non:0};
            if(numeric) colCounts[ci].num++; else colCounts[ci].non++;
          });
        });
        // choose first column with non > num as project-like
        projectCol = colCounts.findIndex(c => c && c.non > c.num);
        if(projectCol === -1) projectCol = 0; // fallback to first column
      }

      // iterate rows for this table
      const dataRows2 = table.querySelectorAll('tbody tr');
      const iterateRows2 = dataRows2.length ? Array.from(dataRows2) : rows.slice(1);

      iterateRows2.forEach(r => {
        const cells = Array.from(r.querySelectorAll('td'));
        if(cells.length === 0) return;
        const project = (cells[projectCol] && cells[projectCol].textContent.trim()) || '';
        cells.forEach((cell, ci) => {
          // skip index (first cell) and project name cell
          if(ci === 0 || ci === projectCol) return;
        // attach only if cell content looks numeric (or small decimals)
        const text = cell.textContent.trim();
        const numeric = /^-?\d+(?:\.\d+)?$/.test(text.replace(/,/g,''));
        if(!numeric) return;

        cell.style.cursor = 'help';

        cell.addEventListener('mouseenter', (ev) => {
          const colHeader = headers[ci] || '';
          const html = `
            <div class="ct-title">${escapeHtml(project)}</div>
            <div class="ct-row"><span class="ct-label">Metric:</span> <span class="ct-value">${escapeHtml(colHeader)}</span></div>
            <div class="ct-row"><span class="ct-label">Value:</span> <span class="ct-value">${escapeHtml(text)}</span></div>
          `;
          showTip(html, ev.clientX, ev.clientY);
        });
        cell.addEventListener('mousemove', (ev) => {
          // update position
          if(tip) showTip(tip.innerHTML, ev.clientX, ev.clientY);
        });
        cell.addEventListener('mouseleave', hideTip);
      });
    });

    });

    // small helper
    function escapeHtml(s){
      return (s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
  });
})();
