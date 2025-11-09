
// data from catalogue (synchronized with Pages/catalogue.html)
const projectData = {
    1: { name: "Large Solar Park", values: [4000, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    2: { name: "Small Solar Installations", values: [1200, 18, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    3: { name: "Wind Farm", values: [3800, 55, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    4: { name: "Gas-to-renewables conversion", values: [3200, 25, 1, 0.2, 0.1, 1.5, 0.5, 2, 0.05, 0.01, 0.3] },
    5: { name: "Boiler Retrofit", values: [1400, 20, 0.9, 0.4, 0.2, 0.1, 0.05, 1.2, 0.02, 0.01, 0.05] },
    6: { name: "Catalytic Converters for Buses", values: [2600, 30, 2.8, 0.6, 0.8, 0, 0.5, 5, 0.01, 0.05, 0.02] },
    7: { name: "Diesel Bus Replacement", values: [5000, 48, 3.2, 0.9, 1, 0, 0.7, 6, 0.02, 0.08, 0.03] },
    8: { name: "Traffic Signal/Flow Upgrade", values: [1000, 12, 0.6, 0.1, 0.4, 0.05, 0.2, 3, 0.02, 0.02, 0.01] },
    9: { name: "Low-Emission Stove Program", values: [180, 2, 0.02, 0.01, 0.7, 0, 0.01, 1.5, 0.03, 0.2, 0] },
    10: { name: "Residential Insulation/Efficiency", values: [900, 15, 0.1, 0.05, 0.05, 0.02, 0.02, 0.5, 0, 0, 0.01] },
    11: { name: "Industrial Scrubbers", values: [4200, 6, 0.4, 6, 0.4, 0, 0.1, 0.6, 0.01, 0.01, 0] },
    12: { name: "Waste Methane Capture System", values: [3600, 28, 0.2, 0.1, 0.05, 8, 0.2, 0.1, 0, 0, 0.05] },
    13: { name: "Landfill Gas-to-energy", values: [3400, 24, 0.15, 0.05, 0.03, 6.5, 0.1, 0.05, 0, 0, 0.03] },
    14: { name: "Reforestation (acre-package)", values: [220, 3.5, 0.04, 0.02, 0.01, 0.8, 0.03, 0.1, 0.01, 0.005, 0.005] },
    15: { name: "Urban Tree Canopy Program (street trees)", values: [300, 4.2, 0.06, 0.01, 0.03, 0.6, 0.02, 0.15, 0.005, 0.02, 0.002] },
    16: { name: "Industrial Energy Efficiency Retrofit", values: [1600, 22, 0.5, 0.3, 0.15, 0.2, 0.1, 1, 0.01, 0.01, 0.03] },
    17: { name: "Natural Gas Leak Repair", values: [1800, 10, 0.05, 0.01, 0.01, 4, 0.02, 0.02, 0, 0, 0.01] },
    18: { name: "Agricultural Methane Reduction", values: [2800, 8, 0.02, 0.01, 0.02, 7.2, 0.05, 0.02, 0.1, 0, 0.05] },
    19: { name: "Clean Cookstove & Fuel Switching (community scale)", values: [450, 3.2, 0.04, 0.02, 0.9, 0.1, 0.02, 2, 0.05, 0.25, 0] },
    20: { name: "Rail Electrification", values: [6000, 80, 2, 0.4, 1.2, 0, 0.6, 10, 0.02, 0.1, 0.05] },
    21: { name: "EV Charging Infrastructure", values: [2200, 20, 0.3, 0.05, 0.1, 0, 0.05, 0.5, 0.01, 0.01, 0.01] },
    22: { name: "Biochar for soils (per project unit)", values: [1400, 6, 0.01, 0, 0.01, 2.5, 0.01, 0.01, 0.2, 0, 0.02] },
    23: { name: "Industrial VOC", values: [2600, 2, 0.01, 0, 0, 0, 6.5, 0.1, 0, 0, 0] },
    24: { name: "Heavy-Duty Truck Retrofit", values: [4200, 36, 2.2, 0.6, 0.6, 0, 0.3, 4.2, 0.01, 0.04, 0.02] },
    25: { name: "Port/Harbor Electrification", values: [4800, 28, 1.9, 0.8, 0.7, 0, 0.2, 3.6, 0.01, 0.03, 0.02] },
    26: { name: "Black Carbon reduction", values: [600, 1.8, 0.02, 0.01, 0.6, 0.05, 0.01, 1, 0.02, 0.9, 0] },
    27: { name: "Wetlands restoration", values: [1800, 10, 0.03, 0.02, 0.02, 3.2, 0.01, 0.05, 0.15, 0.02, 0.04] },
    28: { name: "Household LPG conversion program", values: [700, 2.5, 0.03, 0.01, 0.4, 0.05, 0.02, 1.2, 0.03, 0.1, 0] },
    29: { name: "Industrial process change", values: [5000, 3, 0.02, 0.01, 0, 0, 0, 0, 0, 0, 1.5] },
    30: { name: "Behavioral demand-reduction program", values: [400, 9, 0.4, 0.05, 0.05, 0.01, 0.3, 2.5, 0.01, 0.01, 0.01] }
};

const columns = [
    "Cost", "CO2", "NO", "SO2", "PM2.5", "CH4", "VOC", "CO", "NH3", "BC", "N2O"
];

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('optimizerForm');
    const selectAllBtn = document.getElementById('selectAll');
    const resetAllBtn = document.getElementById('resetAll');
    const selCountEl = document.getElementById('selCount');
    const selCostEl = document.getElementById('selCost');
    const selCO2El = document.getElementById('selCO2');
    const selectionCount = document.getElementById('selectionCount');

    // Select All button
    selectAllBtn.addEventListener('click', function() {
        const checkboxes = document.querySelectorAll('input[name="project"]');
        checkboxes.forEach(cb => cb.checked = true);
        updateSummary();
    });

    // Reset button
    resetAllBtn.addEventListener('click', function() {
        const checkboxes = document.querySelectorAll('input[name="project"]');
        checkboxes.forEach(cb => cb.checked = false);
        updateSummary();
        try { localStorage.removeItem('optimizerRan'); } catch(e) { /* ignore */ }
        // Results UI removed from optimizer page — nothing to reset here.
    });

    // update the selection summary (count, cost, CO2)
    function updateSummary(){
        const checkedBoxes = document.querySelectorAll('input[name="project"]:checked');
        const selected = Array.from(checkedBoxes).map(cb => parseInt(cb.value));
        let totalCost = 0, totalCO2 = 0;
        selected.forEach(no => {
            const p = projectData[no];
            if (p && Array.isArray(p.values)){
                totalCost += Number(p.values[0] || 0);
                totalCO2 += Number(p.values[1] || 0);
            }
        });
        if (selCountEl) selCountEl.textContent = selected.length;
        if (selCostEl) selCostEl.textContent = totalCost.toLocaleString();
        if (selCO2El) selCO2El.textContent = totalCO2;
        if (selectionCount) selectionCount.textContent = `${selected.length} selected`;
    }

    // sanitize text received from server to fix common mojibake (e.g. "â€”") and format safely
    function sanitizeText(s){
        if (s === null || s === undefined) return '';
        let out = String(s);
        try {
            // attempt latin1 -> utf8 fix
            out = decodeURIComponent(escape(out));
        } catch(e) {
            // ignore if it fails
        }
        // common broken sequences -> colon (simple ASCII separator)
        out = out.replace(/â€”|â€“|â€\u0014/g, ': ');
        // replacement character
        out = out.replace(/\uFFFD/g, '?');
        return out;
    }

    // Listen for changes on checkboxes to keep summary live
    document.querySelectorAll('input[name="project"]').forEach(cb => cb.addEventListener('change', updateSummary));

    // initialize summary on page load
    updateSummary();

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Get selected checkboxes
        const checkedBoxes = document.querySelectorAll('input[name="project"]:checked');

        if (checkedBoxes.length === 0) {
            // No selection — show themed modal asking the user to pick a project first
            if (window.klModal && typeof window.klModal.show === 'function'){
                window.klModal.show({ type: 'error', title: 'Please pick first', message: 'Please pick at least one project before running the optimizer.', okText: 'Got it' });
            } else {
                const first = document.querySelector('input[name="project"]');
                if (first) first.focus();
            }
            return;
        }

        // Get selected project numbers only
        const selectedProjects = Array.from(checkedBoxes).map(checkbox => {
            const projectNo = parseInt(checkbox.value);
            return {
                name: projectData[projectNo].name,
                data: projectData[projectNo].values
            };
        });
        // Send ToReceive in the simple format expected by the optimizer:
        // {
        //   "projects": [ { name, data }, ... ],
        //   "goals": [CO2, NO, SO2, PM2.5, CH4, VOC, CO, NH3, BC, N2O]
        // }
        const jsonToSend = {
            projects: selectedProjects,
            goals: [1000, 35, 25, 20, 60, 45, 80, 12, 6, 10]
        };

        // Save
        try {
            const response = await fetch('/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Send compact JSON (no pretty-printing) so stored files stay concise
                body: JSON.stringify(jsonToSend)
            });

            // Results are displayed on results.html. Handle response and redirect on success.
            if (!response) { console.error('No response from server'); return; }
            const body = await response.json().catch(() => null);
            // If the server returned a non-OK status, try to surface its message via modal
            if (!response.ok) {
                const msg = (body && body.error) ? body.error : `Server error: ${response.status}`;
                console.error('Error running optimizer:', msg);
                if (window.klModal && typeof window.klModal.show === 'function'){
                    const lower = (msg || '').toString().toLowerCase();
                    if (/infeasible/.test(lower)){
                        window.klModal.show({ type:'error', title:'Infeasible problem', message:'The optimizer reports the problem is infeasible (no feasible solution meets the goals). Please adjust targets or project selection.' });
                    } else if (/unbounded/.test(lower)){
                        window.klModal.show({ type:'error', title:'Unbounded solution', message:'The optimizer reports an unbounded solution. This usually means objectives or constraints need more limits. Check your inputs.' });
                    } else {
                        window.klModal.show({ type:'error', title:'Server error', message: sanitizeText(msg) });
                    }
                }
                return;
            }

            // Server returned OK. Now fetch the generated Data/ToSend.json to determine whether R produced an error or a solution.
            try {
                const toSendResp = await fetch('/Data/ToSend.json?t=' + Date.now(), { cache: 'no-store' });
                if (!toSendResp.ok) {
                    // if ToSend.json isn't available, still redirect to results page which may show an error
                    try { localStorage.setItem('optimizerRan', '1'); } catch (e) { /* ignore */ }
                    window.location.href = 'results.html';
                    return;
                }
                const toSend = await toSendResp.json().catch(() => null);
                if (toSend) {
                    // If R or fallback attached an error string, check it
                    const errMsg = (toSend.error || toSend.error_message || '').toString().toLowerCase();
                    if (errMsg) {
                        if (/infeasible/.test(errMsg)){
                            if (window.klModal && typeof window.klModal.show === 'function'){
                                window.klModal.show({ type:'error', title:'Infeasible problem', message:'The optimizer reports the problem is infeasible (no feasible solution meets the goals). Please adjust targets or project selection.' });
                                return;
                            }
                        }
                        if (/unbounded/.test(errMsg)){
                            if (window.klModal && typeof window.klModal.show === 'function'){
                                window.klModal.show({ type:'error', title:'Unbounded solution', message:'The optimizer reports an unbounded solution. This usually means objectives or constraints need more limits. Check your inputs.' });
                                return;
                            }
                        }
                    }

                    // If minimization result exists, proceed to results page
                    if (toSend.minimization || toSend.result || toSend.tableau || toSend.tableau_body) {
                        try { localStorage.setItem('optimizerRan', '1'); } catch (e) { /* ignore */ }
                        window.location.href = 'results.html';
                        return;
                    }
                }

                // Fallback: no explicit error found and no clear solution — still go to results.html so the results page can decide what to show.
                try { localStorage.setItem('optimizerRan', '1'); } catch (e) { /* ignore */ }
                window.location.href = 'results.html';
                return;
            } catch (e) {
                console.error('Error fetching ToSend.json:', e);
                // If anything fails, redirect so the results page can surface details
                try { localStorage.setItem('optimizerRan', '1'); } catch (err2) { /* ignore */ }
                window.location.href = 'results.html';
                return;
            }

        } catch (err) {
            // Network/client error — log it. There is no inline results area on this page.
            console.error('Network or client error running optimizer:', err);
        }
    });
});
