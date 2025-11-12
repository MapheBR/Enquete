function createOption(value = '') {
  const wrap = document.createElement('div');
  wrap.className = 'option-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Opção';
  input.value = value;
  input.className = 'opt-input';
  // track previous trimmed value to avoid repeated auto-adds
  input.dataset.prev = (value || '').trim();
  wrap.appendChild(input);

  const controls = document.createElement('div');
  controls.className = 'option-controls';

  const btnUp = document.createElement('button');
  btnUp.type = 'button';
  btnUp.textContent = '▲';
  btnUp.title = 'Mover para cima';
  btnUp.className = 'btn-up';
  btnUp.onclick = () => {
    const prev = wrap.previousElementSibling;
    if (prev) wrap.parentNode.insertBefore(wrap, prev);
    updateControls();
    input.focus();
  };
  controls.appendChild(btnUp);

  const btnDown = document.createElement('button');
  btnDown.type = 'button';
  btnDown.textContent = '▼';
  btnDown.title = 'Mover para baixo';
  btnDown.className = 'btn-down';
  btnDown.onclick = () => {
    const next = wrap.nextElementSibling;
    if (next) wrap.parentNode.insertBefore(next, wrap);
    updateControls();
    input.focus();
  };
  controls.appendChild(btnDown);

  const btnRemove = document.createElement('button');
  btnRemove.type = 'button';
  btnRemove.textContent = 'Remover';
  btnRemove.title = 'Remover opção';
  btnRemove.className = 'btn-remove';
  btnRemove.onclick = () => {
    const rows = optionsEl.querySelectorAll('.option-row');
    // only allow remove if there are more than 2 option rows
    if (rows.length > 2) {
      wrap.remove();
      updateControls();
    } else {
      // give a small visual cue
      markInvalid(input, true);
      setTimeout(() => markInvalid(input, false), 900);
    }
  };
  controls.appendChild(btnRemove);

  wrap.appendChild(controls);

  // auto-add behavior: only when last input goes from empty -> non-empty (and limit)
  input.addEventListener('input', () => {
    markInvalid(input, false);
    const allInputs = Array.from(optionsEl.querySelectorAll('.option-row input'));
    const last = allInputs[allInputs.length - 1];
    const prev = input.dataset.prev || '';
    const curr = input.value.trim();
    const MAX_OPTIONS = 10;
    if (last === input && prev.length === 0 && curr.length >= 2 && allInputs.length < MAX_OPTIONS) {
      optionsEl.appendChild(createOption(''));
      updateControls();
    }
    input.dataset.prev = curr;
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // if Enter pressed, move focus to next input or create new
      const allInputs = Array.from(optionsEl.querySelectorAll('.option-row input'));
      const idx = allInputs.indexOf(input);
      if (idx < allInputs.length - 1) {
        allInputs[idx + 1].focus();
      } else {
        optionsEl.appendChild(createOption(''));
        updateControls();
        const nextInputs = Array.from(optionsEl.querySelectorAll('.option-row input'));
        nextInputs[nextInputs.length - 1].focus();
      }
    }
  });

  return wrap;
}

const optionsEl = document.getElementById('options');

function clearOptions() {
  optionsEl.innerHTML = '';
}

function markInvalid(inputEl, invalid = true) {
  inputEl.style.borderColor = invalid ? '#ef4444' : '';
}

function updateControls() {
  const rows = Array.from(optionsEl.querySelectorAll('.option-row'));
  const inputs = rows.map(r => r.querySelector('input'));
  const removeBtns = rows.map(r => r.querySelector('.btn-remove'));
  // ensure at least 2 options exist
  if (rows.length <= 2) {
    removeBtns.forEach(b => b && (b.disabled = true));
  } else {
    removeBtns.forEach(b => b && (b.disabled = false));
  }
  // disable up for first, down for last
  rows.forEach((r, i) => {
    const up = r.querySelector('.btn-up');
    const down = r.querySelector('.btn-down');
    if (up) up.disabled = i === 0;
    if (down) down.disabled = i === rows.length - 1;
  });
}

clearOptions();
optionsEl.appendChild(createOption('Opção 1'));
optionsEl.appendChild(createOption('Opção 2'));
updateControls();

document.getElementById('addOpt').addEventListener('click', (e) => {
  e.preventDefault();
  const newRow = createOption('');
  optionsEl.appendChild(newRow);
  updateControls();
  newRow.querySelector('input').focus();
});

function showMessage(text, type = 'info') {
  const msg = document.getElementById('msg');
  msg.textContent = text;
  if (type === 'error') {
    msg.style.color = '#b91c1c';
  } else if (type === 'success') {
    msg.style.color = '#064e3b';
  } else {
    msg.style.color = '';
  }
}

// lista e votação - funções adicionadas
async function fetchPollsList() {
  try {
    const res = await fetch('/api/polls');
    if (!res.ok) return;
    const polls = await res.json();
    renderPollList(polls);
  } catch (err) {
    // ignore
  }
}

function renderPollList(polls) {
  // remover lista antiga se existir
  let listWrap = document.getElementById('polls-list');
  if (!listWrap) {
    listWrap = document.createElement('aside');
    listWrap.id = 'polls-list';
    const mainCard = document.querySelector('.card');
    mainCard.appendChild(listWrap);
  }
  listWrap.innerHTML = '<h3>Enquetes Criadas</h3>';
  if (!polls || polls.length === 0) {
    listWrap.innerHTML += '<div>Nenhuma enquete ainda</div>';
    return;
  }
  polls.forEach(p => {
    const row = document.createElement('div');
    row.className = 'poll-list-row';
    const title = document.createElement('div');
    title.className = 'poll-list-title';
    title.textContent = p.question;

    const actions = document.createElement('div');
    actions.className = 'poll-list-actions';

    const btnOpen = document.createElement('button');
    btnOpen.textContent = 'Abrir';
    btnOpen.className = 'btn-open-poll';
    // abrir em página dedicada /poll.html?id=...
    btnOpen.onclick = () => {
      window.location.href = '/poll.html?id=' + encodeURIComponent(p.id);
    };

    const btnDelete = document.createElement('button');
    btnDelete.textContent = 'Apagar';
    btnDelete.className = 'btn-delete';
    btnDelete.onclick = async () => {
      if (!confirm('Apagar enquete? Esta ação não pode ser desfeita.')) return;
      try {
        const res = await fetch('/api/polls/' + encodeURIComponent(p.id), { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
          showMessage('Enquete apagada.', 'success');
          // remover visual e recarregar lista
          fetchPollsList();
          const existing = document.getElementById('poll-result');
          if (existing && String(existing.dataset.pollId) === String(p.id)) existing.remove();
        } else {
          showMessage(data.error || 'Erro ao apagar', 'error');
        }
      } catch (err) {
        showMessage('Falha de conexão.', 'error');
      }
    };

    actions.appendChild(btnOpen);
    actions.appendChild(btnDelete);
    row.appendChild(title);
    row.appendChild(actions);
    listWrap.appendChild(row);
  });
}

// loadPollResult(id, focusVoteButton) - atualiza para permitir votação
async function loadPollResult(id, focusVoteButton = false) {
  try {
    const res = await fetch('/api/polls/' + encodeURIComponent(id));
    if (!res.ok) return;
    const poll = await res.json();
    if (!poll) return;
    renderPollResult(poll, focusVoteButton);
  } catch (err) {
    // ignore
  }
}

function renderPollResult(poll, focusVoteButton = false) {
  const existing = document.getElementById('poll-result');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'poll-result';
  container.className = 'poll-result';

  const title = document.createElement('h2');
  title.textContent = poll.question;
  title.className = 'poll-result-title';
  container.appendChild(title);

  const total = (poll.options || []).reduce((s,o) => s + (o.votes || 0), 0) || 0;
  const list = document.createElement('div');
  list.className = 'poll-options-list';

  poll.options.forEach(opt => {
    const row = document.createElement('div');
    row.className = 'poll-option-row';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '8px';
    left.style.flex = '1';

    const label = document.createElement('div');
    label.className = 'poll-option-label';
    label.textContent = opt.text;
    left.appendChild(label);

    const voteBtn = document.createElement('button');
    voteBtn.textContent = 'Votar';
    voteBtn.className = 'btn-vote';
    voteBtn.style.marginLeft = '6px';
    voteBtn.onclick = async () => {
      voteBtn.disabled = true;
      try {
        const r = await fetch('/api/polls/' + encodeURIComponent(poll.id) + '/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ optionId: opt.id })
        });
        if (r.ok) {
          const updated = await r.json();
          renderPollResult(updated, false);
          fetchPollsList(); // atualizar lista caso queira
        } else {
          const err = await r.json();
          showMessage(err.error || 'Erro ao votar', 'error');
          voteBtn.disabled = false;
        }
      } catch (e) {
        showMessage('Falha de conexão', 'error');
        voteBtn.disabled = false;
      }
    };

    left.appendChild(voteBtn);
    row.appendChild(left);

    const pct = total === 0 ? 0 : Math.round(((opt.votes || 0) / total) * 100);
    const barWrap = document.createElement('div');
    barWrap.className = 'poll-bar-wrap';
    const bar = document.createElement('div');
    bar.className = 'poll-bar';
    bar.style.width = pct + '%';
    bar.textContent = (opt.votes || 0) + ' (' + pct + '%)';
    barWrap.appendChild(bar);
    row.appendChild(barWrap);

    list.appendChild(row);
  });

  container.appendChild(list);

  const msg = document.getElementById('msg');
  msg.parentNode.insertBefore(container, msg.nextSibling);

  // opcional: foco no primeiro botão de votar
  if (focusVoteButton) {
    const firstVote = container.querySelector('.btn-vote');
    if (firstVote) firstVote.focus();
  }
}

// inicializar lista ao carregar a página
fetchPollsList();

document.getElementById('submit').addEventListener('click', async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById('submit');
  const addBtn = document.getElementById('addOpt');
  const questionEl = document.getElementById('question');
  const question = questionEl.value.trim();

  const inputs = Array.from(optionsEl.querySelectorAll('.option-row input'));
  const opts = inputs.map(i => i.value.trim()).filter(v => v.length);

  // reset visuals
  inputs.forEach(i => markInvalid(i, false));
  showMessage('', 'info');

  if (!question) {
    showMessage('Informe a pergunta.', 'error');
    questionEl.focus();
    return;
  }
  if (opts.length < 2) {
    showMessage('Informe pelo menos duas opções válidas.', 'error');
    // highlight empty inputs
    inputs.forEach(i => { if (!i.value.trim()) markInvalid(i, true); });
    return;
  }

  // check duplicates (case-insensitive)
  const lower = opts.map(o => o.toLowerCase());
  const dup = lower.some((v, idx) => lower.indexOf(v) !== idx);
  if (dup) {
    showMessage('Existem opções duplicadas.', 'error');
    // mark duplicates
    const seen = {};
    inputs.forEach(i => {
      const val = i.value.trim().toLowerCase();
      if (!val) return;
      if (seen[val]) {
        markInvalid(i, true);
        markInvalid(seen[val], true);
      } else {
        seen[val] = i;
      }
    });
    return;
  }

  // disable UI while sending
  submitBtn.disabled = true;
  addBtn.disabled = true;
  const oldText = submitBtn.textContent;
  submitBtn.textContent = 'Criando...';

  try {
    const res = await fetch('/api/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, options: opts })
    });
    const data = await res.json();
    if (res.ok) {
      showMessage('Enquete criada! id: ' + data.id, 'success');
      // clear draft and mark not dirty
      localStorage.removeItem(DRAFT_KEY);
      isDirty = false;

      // show modal with link + auto-redirect (user can copy/open or close)
      showCreatedModal(data.id);

      // small visual: disable submit briefly then re-enable if user closes modal
      submitBtn.disabled = true;
      setTimeout(() => { submitBtn.disabled = false; }, 1200);
    } else {
      showMessage(data.error || 'Erro ao criar enquete.', 'error');
    }
  } catch (err) {
    showMessage('Falha de conexão.', 'error');
  } finally {
    submitBtn.disabled = false;
    addBtn.disabled = false;
    submitBtn.textContent = oldText;
  }
});

// ----- ADDED: globals, autosave, unload guard -----
const MAX_OPTIONS = 10;
const DRAFT_KEY = 'poll_draft_v1';
let isDirty = false;
let autoRedirectTimer = null;

function saveDraft() {
  const question = document.getElementById('question').value.trim();
  const inputs = Array.from(optionsEl.querySelectorAll('.option-row input'));
  const opts = inputs.map(i => i.value);
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ question, options: opts }));
  isDirty = true;
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d.question) document.getElementById('question').value = d.question;
    if (Array.isArray(d.options) && d.options.length) {
      clearOptions();
      d.options.slice(0, MAX_OPTIONS).forEach((o, idx) => {
        optionsEl.appendChild(createOption(o || (idx < 2 ? `Opção ${idx+1}` : '')));
      });
      updateControls();
    }
  } catch {}
}

// mark dirty on input changes and autosave
document.addEventListener('input', (e) => {
  if (e.target && (e.target.id === 'question' || e.target.classList.contains('opt-input'))) {
    saveDraft();
  }
});

// warn before unload if unsaved
window.addEventListener('beforeunload', (ev) => {
  if (isDirty) {
    ev.preventDefault();
    ev.returnValue = '';
    return '';
  }
});

// Ctrl+Enter to submit quickly
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    const submitBtn = document.getElementById('submit');
    if (submitBtn && !submitBtn.disabled) submitBtn.click();
  }
});

// restore draft on load
loadDraft();

// ----- ADDED: modal for created poll with copy/open/redirect -----
function showCreatedModal(pollId) {
  // remove existing modal
  const prev = document.getElementById('created-modal');
  if (prev) prev.remove();

  const modal = document.createElement('div');
  modal.id = 'created-modal';
  modal.className = 'created-modal';
  modal.innerHTML = `
    <div class="created-modal-card">
      <h3>Enquete criada!</h3>
      <p class="muted">ID: ${pollId}</p>
      <div class="created-actions">
        <button id="open-poll" class="btn primary">Abrir Enquete</button>
        <button id="copy-link" class="btn secondary">Copiar Link</button>
        <button id="close-modal" class="btn">Continuar aqui</button>
      </div>
      <p class="small muted">Redirecionando em <span id="redirect-count">5</span>s — feche para cancelar.</p>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('open-poll').onclick = () => {
    window.location.href = '/poll.html?id=' + encodeURIComponent(pollId);
  };
  document.getElementById('copy-link').onclick = async () => {
    try {
      await navigator.clipboard.writeText(location.origin + '/poll.html?id=' + encodeURIComponent(pollId));
      showMessage('Link copiado!', 'success');
    } catch {
      showMessage('Falha ao copiar.', 'error');
    }
  };
  document.getElementById('close-modal').onclick = () => {
    closeCreatedModal();
  };

  // auto redirect countdown
  let sec = 5;
  const span = document.getElementById('redirect-count');
  autoRedirectTimer = setInterval(() => {
    sec -= 1;
    span.textContent = String(sec);
    if (sec <= 0) {
      clearInterval(autoRedirectTimer);
      window.location.href = '/poll.html?id=' + encodeURIComponent(pollId);
    }
  }, 1000);
}

function closeCreatedModal() {
  const prev = document.getElementById('created-modal');
  if (prev) prev.remove();
  if (autoRedirectTimer) { clearInterval(autoRedirectTimer); autoRedirectTimer = null; }
}