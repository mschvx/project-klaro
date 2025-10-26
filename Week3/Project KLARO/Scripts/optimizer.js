
// data from catalogue
const projectData = {
    1: {
        name: "Large Solar Park",
        values: [4000, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    2: {
        name: "Small Solar Installations",
        values: [1200, 18, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    3: {
        name: "Wind Farm",
        values: [3800, 55, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    4: {
        name: "Gas-to-renewables conversion",
        values: [3200, 25, 1, 0.2, 0.1, 1.5, 0.5, 2, 0.05, 0.01, 0.3]
    },
    5: {
        name: "Boiler Retrofit",
        values: [1400, 20, 0.9, 0.4, 0.2, 0.1, 0.05, 1.2, 0.02, 0.01, 0.05]
    },
    6: {
        name: "Catalytic Converters for Buses",
        values: [2600, 30, 2.8, 0.6, 0.8, 0, 0.5, 5, 0.01, 0.05, 0.02]
    },
    7: {
        name: "Diesel Bus Replacement",
        values: [5000, 48, 3.2, 0.9, 1, 0, 0.7, 6, 0.02, 0.08, 0.03]
    },
    8: {
        name: "Traffic Signal/Flow Upgrade",
        values: [1000, 12, 0.6, 0.1, 0.4, 0.05, 0.2, 3, 0.02, 0.02, 0.01]
    },
    9: {
        name: "Low-Emission Stove Program",
        values: [180, 2, 0.02, 0.01, 0.7, 0, 0.01, 1.5, 0.03, 0.2, 0]
    },
    10: {
        name: "Residential Insulation/Efficiency",
        values: [900, 15, 0.1, 0.05, 0.05, 0.02, 0.02, 0.5, 0, 0, 0.01]
    },
    11: {
        name: "Industrial Scrubbers",
        values: [4200, 6, 0.4, 6, 0.4, 0, 0.1, 0.6, 0.01, 0.01, 0]
    },
    12: {
        name: "Waste Methane Capture System",
        values: [3600, 28, 0.2, 0.1, 0.05, 8, 0.2, 0.1, 0, 0, 0.05]
    },
    13: {
        name: "Landfill Gas-to-energy",
        values: [3400, 24, 0.15, 0.05, 0.03, 6.5, 0.1, 0.05, 0, 0, 0.03]
    },
    14: {
        name: "Reforestation (acre-package)",
        values: [220, 3.5, 0.04, 0.02, 0.01, 0.8, 0.03, 0.01, 0, 0.05, 0.05]
    },
    15: {
        name: "Urban Tree Canopy Program (street trees)",
        values: [300, 4.2, 0.06, 0.01, 0.03, 0.6, 0.02, 0.05, 0, 0, 0.02]
    },
    16: {
        name: "Industrial Energy Efficiency Retrofit",
        values: [1600, 22, 0.5, 0.3, 0.15, 0.2, 0.1, 0.01, 0, 0, 0.03]
    },
    17: {
        name: "Natural Gas Leak Repair",
        values: [1800, 10, 0.05, 0.01, 0.01, 0.14, 0.02, 0.02, 0, 0, 0.01]
    },
    18: {
        name: "Agricultural Methane Reduction",
        values: [2800, 8, 0.02, 0.01, 0.01, 27.2, 0, 5, 0.2, 0.1, 0]
    },
    19: {
        name: "Clean Cookstove & Fuel Switching (community scale)",
        values: [450, 3.2, 0.04, 0.02, 0.9, 0.1, 0.02, 0, 2, 0.05, 0.2]
    },
    20: {
        name: "Rail Electrification",
        values: [6000, 80, 2, 0.4, 1.2, 0, 0.6, 1, 0, 0.2, 0.05]
    },
    21: {
        name: "EV Charging Infrastructure",
        values: [2200, 20, 0.3, 0.05, 0.1, 0, 0.5, 0, 1, 0, 0]
    },
    22: {
        name: "Biochar for soils (per project unit)",
        values: [1400, 6, 0.01, 0, 0, 12.5, 0, 1, 0.2, 0, 0.2]
    },
    23: {
        name: "Industrial VOC",
        values: [2600, 2, 0.01, 0, 0, 0, 6.5, 0.1, 0, 0, 0]
    },
    24: {
        name: "Heavy-Duty Truck Retrofit",
        values: [4200, 36, 2.2, 0.6, 0.6, 0, 0.3, 4.2, 0.01, 0.04, 0.02]
    },
    25: {
        name: "Port/Harbor Electrification",
        values: [4800, 28, 1.9, 0.8, 0.7, 0, 0.2, 3.6, 0.01, 0.03, 0.02]
    },
    26: {
        name: "Black Carbon reduction",
        values: [600, 1.8, 0.02, 0.01, 0.6, 0.05, 0.01, 1, 0.02, 0.9, 0]
    },
    27: {
        name: "Wetlands restoration",
        values: [1800, 10, 0.03, 0.02, 0.02, 3.2, 0.01, 0.05, 0.15, 0.02, 0.04]
    },
    28: {
        name: "Household LPG conversion program",
        values: [700, 2.5, 0.03, 0.01, 0.4, 0.05, 0.02, 1.2, 0.03, 0.1, 0]
    },
    29: {
        name: "Industrial process change",
        values: [5000, 3, 0.02, 0.01, 0, 0, 0, 0, 0, 0, 1.5]
    },
    30: {
        name: "Behavioral demand-reduction program",
        values: [400, 9, 0.4, 0.05, 0.05, 0.01, 0.3, 2.5, 0.01, 0.01, 0.01]
    }
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
        // Reset results area to the default prompt since user cleared selections
        try {
            const out = document.getElementById('output');
            if (out) {
                out.innerHTML = '<div style="color:var(--muted)"><strong>No results yet</strong>: select projects and click <em>Optimize Solution</em>.</div>';
            }
        } catch (e) { /* ignore DOM issues */ }
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
            alert('Please select at least one project!');
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
        const jsonToSend = {
            columns: columns,
            projects: selectedProjects
        };

        // Save
        try {
            const response = await fetch('/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jsonToSend, null, 2)
            });

            const out = document.getElementById('output');

            if (!response) {
                out.innerText = 'No response from server';
                return;
            }

            const body = await response.json().catch(() => null);

            if (!response.ok) {
                // Show server-side error (R failure etc.)
                const msg = (body && body.error) ? body.error : `Server error: ${response.status}`;
                out.innerText = sanitizeText(`Error running optimizer: ${msg}`);
                return;
            }

            // Success: server ran Rscript and returned output
            if (body && body.output) {
                // show R stdout briefly in results area (sanitized)
                out.innerText = sanitizeText(body.output) + '\nLoading tableau...';
            }

            // mark that optimizer has been run in this browser session and refresh results
            try {
                localStorage.setItem('optimizerRan', '1');
            } catch (e) { /* ignore storage errors */ }

            if (typeof window.showResults === 'function') {
                window.showResults();
            } else {
                window.location.reload();
            }

        } catch (err) {
            const out = document.getElementById('output');
            out.innerText = sanitizeText('Network or client error: ' + (err && err.message ? err.message : String(err)));
            console.error(err);
        }
    });
});
