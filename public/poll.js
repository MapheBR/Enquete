(async function() {
  function qs(name) {
    const params = new URLSearchParams(location.search);
    return params.get(name);
  }
  function showMsg(text, type = '') {
    const el = document.getElementById('poll-msg');
    el.textContent = text || '';
    el.style.color = type === 'error' ? '#b91c1c' : (type === 'success' ? '#064e3b' : '');
  }

  function createBarRow(opt, total, onVote) {
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
    voteBtn.className = 'btn-vote';
    voteBtn.textContent = 'Votar';
    voteBtn.onclick = () => { voteBtn.disabled = true; onVote(opt.id, voteBtn); };
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

    return row;
  }

  async function loadPoll(id) {
    showMsg('Carregando...');
    try {
      const res = await fetch('/api/polls/' + encodeURIComponent(id));
      if (!res.ok) {
        showMsg('Enquete não encontrada.', 'error');
        return;
      }
      const poll = await res.json();
      render(poll);
      showMsg('');
    } catch (e) {
      showMsg('Erro ao carregar enquete.', 'error');
    }
  }

  function render(poll) {
    const container = document.getElementById('poll-container');
    container.innerHTML = '';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.gap = '12px';

    const title = document.createElement('h1');
    title.textContent = poll.question;
    title.style.fontSize = '22px';
    title.style.margin = '0';
    header.appendChild(title);

    const share = document.createElement('div');
    share.style.display = 'flex';
    share.style.gap = '8px';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copiar link';
    copyBtn.className = 'btn secondary';
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        showMsg('Link copiado!', 'success');
      } catch {
        showMsg('Não foi possível copiar.', 'error');
      }
    };
    share.appendChild(copyBtn);

    header.appendChild(share);
    container.appendChild(header);

    const total = (poll.options || []).reduce((s,o) => s + (o.votes || 0), 0);

    // Check if user already voted (localStorage)
    const votedKey = 'voted_poll_' + poll.id;
    const votedFor = localStorage.getItem(votedKey); // optionId or null

    const list = document.createElement('div');
    list.className = 'poll-options-list';

    poll.options.forEach(opt => {
      const row = createBarRow(opt, total, async (optId, btn) => {
        // prevent if already voted
        if (localStorage.getItem(votedKey)) {
          showMsg('Você já votou nesta enquete.', 'error');
          btn.disabled = true;
          return;
        }
        try {
          const r = await fetch('/api/polls/' + encodeURIComponent(poll.id) + '/vote', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ optionId: optId })
          });
          if (!r.ok) {
            const e = await r.json();
            showMsg(e.error || 'Erro ao votar', 'error');
            btn.disabled = false;
            return;
          }
          const updated = await r.json();
          // persist vote locally
          localStorage.setItem(votedKey, String(optId));
          render(updated);
          showMsg('Voto computado!', 'success');
        } catch (err) {
          showMsg('Falha ao enviar voto', 'error');
          btn.disabled = false;
        }
      });

      // if user already voted, visually mark selected and disable others
      if (votedFor) {
        const voteBtn = row.querySelector('.btn-vote');
        const optIdStr = String(opt.id);
        if (optIdStr === votedFor) {
          voteBtn.textContent = 'Voto registrado';
          voteBtn.disabled = true;
          row.classList.add('voted');
        } else {
          voteBtn.disabled = true;
        }
      }

      list.appendChild(row);
    });
    container.appendChild(list);

    // ADD: export results CSV button
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Exportar CSV';
    exportBtn.className = 'btn secondary';
    exportBtn.style.marginTop = '12px';
    exportBtn.onclick = () => {
      const csv = ['option,text,votes'];
      poll.options.forEach(o => csv.push([o.id, `"${o.text.replace(/"/g,'""')}"`, o.votes || 0].join(',')));
      const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `poll_${poll.id}_results.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };
    container.appendChild(exportBtn);
  }

  const id = qs('id');
  if (!id) {
    document.getElementById('poll-container').innerHTML = '<div>Enquete inválida.</div>';
  } else {
    loadPoll(id);
  }
})();