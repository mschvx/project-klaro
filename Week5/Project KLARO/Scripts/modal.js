// Simple modal helper used across pages. Exposes `showModal(opts)` & `hideModal()`.
(function(window){
    function ensureMarkup(){
        if (document.getElementById('kl-modal-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'kl-modal-overlay';
        overlay.className = 'kl-modal-overlay';
        overlay.innerHTML = `
          <div class="kl-modal" role="dialog" aria-modal="true" aria-labelledby="kl-modal-title">
            <div class="kl-modal-header">
              <div class="kl-modal-type" id="kl-modal-type">!</div>
              <h3 id="kl-modal-title" class="kl-modal-title">Message</h3>
              <button class="kl-modal-close" id="kl-modal-close" aria-label="Close">×</button>
            </div>
            <div class="kl-modal-body" id="kl-modal-body">
              <p id="kl-modal-text">...message...</p>
            </div>
            <div class="kl-modal-actions" id="kl-modal-actions">
              <button class="kl-btn kl-btn-ghost" id="kl-modal-cancel">Close</button>
              <button class="kl-btn kl-btn-primary" id="kl-modal-ok">OK</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);

        // attach handlers
        overlay.addEventListener('click', function(e){
            if (e.target === overlay) hideModal();
        });
        document.getElementById('kl-modal-close').addEventListener('click', hideModal);
        document.getElementById('kl-modal-cancel').addEventListener('click', hideModal);
        document.getElementById('kl-modal-ok').addEventListener('click', function(){ hideModal(); if (typeof window._klModalOk === 'function') window._klModalOk(); });

        // allow Esc to close
        document.addEventListener('keydown', function(e){ if (!document.getElementById('kl-modal-overlay')) return; if (e.key === 'Escape') hideModal(); });
    }

    function showModal(opts){
        // opts: { type: 'error'|'warn'|'info', title: '', message: '', okText: '', showCancel: bool, onOk: fn }
        ensureMarkup();
        const overlay = document.getElementById('kl-modal-overlay');
        const modal = overlay.querySelector('.kl-modal');
        const titleEl = document.getElementById('kl-modal-title');
        const textEl = document.getElementById('kl-modal-text');
        const typeEl = document.getElementById('kl-modal-type');
        const okBtn = document.getElementById('kl-modal-ok');
        const cancelBtn = document.getElementById('kl-modal-cancel');

        const type = (opts && opts.type) ? opts.type : 'info';
        const title = (opts && opts.title) ? opts.title : (type === 'error' ? 'Error' : 'Notice');
        const message = (opts && opts.message) ? opts.message : '';
        const okText = (opts && opts.okText) ? opts.okText : 'OK';
        const showCancel = !!(opts && opts.showCancel);
        const onOk = (opts && typeof opts.onOk === 'function') ? opts.onOk : null;

        titleEl.textContent = title;
        textEl.innerHTML = String(message);
        okBtn.textContent = okText;
        cancelBtn.style.display = showCancel ? 'inline-block' : 'none';

        // small visual cue per type
        if (type === 'error') { typeEl.textContent = '!'; typeEl.style.background = 'rgba(255,80,80,0.06)'; typeEl.style.color = '#ff9b9b'; }
        else if (type === 'warn') { typeEl.textContent = '⚠'; typeEl.style.background = 'rgba(255,200,80,0.04)'; typeEl.style.color = '#ffd29a'; }
        else { typeEl.textContent = 'ℹ'; typeEl.style.background = 'rgba(111,227,163,0.06)'; typeEl.style.color = 'var(--accent)'; }

        // wire callback for OK
        window._klModalOk = function(){ try{ onOk && onOk(); } finally{ window._klModalOk = null; } };

        overlay.classList.add('visible');
        setTimeout(()=> modal.classList.add('visible'), 10);

        // move focus into the dialog for accessibility
        okBtn.focus();
    }

    function hideModal(){
        const overlay = document.getElementById('kl-modal-overlay');
        if (!overlay) return;
        const modal = overlay.querySelector('.kl-modal');
        modal.classList.remove('visible');
        overlay.classList.remove('visible');
        try { overlay.remove(); } catch(e) { /* ignore */ }
        window._klModalOk = null;
    }

    // expose
    window.klModal = { show: showModal, hide: hideModal };
})(window);
