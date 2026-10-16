// ============================================================
// # 🔍 📌  WHAT IS BEHIND THE SQUARE, WHEN IT IS PRESSED
// # 🔤 JavaScript
// # 🎯 Opens on the square of a chapter and shows the eleven steps of
// #    summarising it, what each one left behind, and which of them
// #    this book can have at all.
// # 🔗 Two things it refuses to do. It will not draw a step that left
// #    no artefact as though it had been measured - four of the eleven
// #    are checked by guards and written up in the delivery note, and
// #    those are shown as attested, not scored. And it will not guess
// #    which chapter in the tree a chapter on the board is: MGT210
// #    holds both B1-Ch2 and B2-Ch2, so a bare "2" names two and
// #    therefore names none. An unmatched chapter is told it is
// #    unmatched, which is a thing the reader can act on.
// ============================================================
(() => {
  'use strict';

  const S = () => window.MyTermSummary;
  const esc = t => String(t == null ? '' : t)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let pane = null;

  const shut = () => { if (pane) { pane.remove(); pane = null; } };
  addEventListener('keydown', e => { if (e.key === 'Escape') shut(); });

  const bar = (v, muted) => {
    const pc = Math.round((v || 0) * 100);
    return '<span class="sumBar' + (muted ? ' off' : '') + '">' +
           '<i style="width:' + pc + '%"></i></span>';
  };

  const partRows = (ch, nature) => S().PARTS.map(([key, weight, what]) => {
    const na = (nature.unreachable || []).includes(key);
    const v = ch.parts[key] || 0;
    return '<tr' + (na ? ' class="na"' : '') + '>' +
      '<td class="k">' + esc(what) + '</td>' +
      '<td class="w">' + weight + '</td>' +
      '<td class="b">' + (na ? '<span class="naWord">not in this book</span>' : bar(v)) + '</td>' +
      '<td class="v">' + (na ? '—' : Math.round(v * 100) + '%') + '</td>' +
    '</tr>';
  }).join('');

  const stepRows = (ch, nature) => S().STEPS.map(([no, title, parts, kind]) => {
    const na = parts.length && parts.every(p => (nature.unreachable || []).includes(p));
    let state, note;
    if (na) { state = 'na'; note = 'this book has none'; }
    else if (!parts.length) {
      state = 'attested';
      note = kind === 'optional' ? 'optional - no artefact' : 'checked by guards, written up in the delivery';
    } else if (parts[0] === 'laws') {
      const n = ch.counts && ch.counts.laws;
      state = (ch.laws || n) ? 'done' : 'na';
      note = (ch.laws || n) ? (ch.laws || n) + ' law pages' : 'not a practical course';
    } else {
      const vals = parts.map(p => ch.parts[p] || 0);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      state = avg >= 0.999 ? 'done' : avg > 0 ? 'part' : 'todo';
      note = parts.map(p => p + ' ' + Math.round((ch.parts[p] || 0) * 100) + '%').join(' · ');
    }
    const mark = { done: '●', part: '◐', todo: '○', attested: '◆', na: '·' }[state];
    return '<li class="st ' + state + '"><b>' + mark + '</b>' +
      '<span class="no">' + no + '</span>' +
      '<span class="ti">' + esc(title) + '</span>' +
      '<span class="nt">' + esc(note) + '</span></li>';
  }).join('');

  const open = async (courseName, chapterName, anchor) => {
    shut();
    await S().load();

    pane = document.createElement('div');
    pane.className = 'sumPane';
    pane.innerHTML = '<div class="sumCard">reading…</div>';
    document.body.append(pane);
    pane.onclick = e => { if (e.target === pane) shut(); };

    const nature = S().courseOf(courseName);
    const card = pane.querySelector('.sumCard');

    if (!nature) {
      card.innerHTML = head(courseName, chapterName) +
        '<p class="sumNo">No summarising work is filed under this course name.</p>';
      return;
    }
    const key = S().chapterKey(nature, chapterName);
    if (!key) {
      card.innerHTML = head(courseName, chapterName) +
        '<p class="sumNo">This chapter is not matched to one in ' + esc(nature.course) + '.' +
        (/^\s*\d+\s*$/.test(String(chapterName || '')) || !chapterName
          ? ' A number alone is not enough here - the course holds ' + nature.chapters.length +
            ' chapters and more than one can carry the same number.'
          : '') +
        '</p><p class="sumList">' + nature.chapters.map(c => '<span>' + esc(c) + '</span>').join('') + '</p>';
      return;
    }

    const ch = await S().chapterData(nature.course, key);
    if (!ch) { card.innerHTML = head(courseName, key) + '<p class="sumNo">Could not read that chapter.</p>'; return; }

    const r = S().readingFor(ch);
    const lost = 100 - r.reachable;

    card.innerHTML = head(nature.course, key) +
      '<div class="sumTop">' +
        '<div class="sumBig"><b>' + r.ofReachable + '%</b><s>of what this book can have</s></div>' +
        '<div class="sumSide">' +
          '<div>' + r.pct + ' of ' + r.reachable + ' points earned</div>' +
          (lost ? '<div class="sumCap">' + lost + ' points are not reachable: ' +
                  esc(r.unreachable.join(', ')) + ' - this book has no test bank</div>' : '') +
        '</div>' +
      '</div>' +

      '<h4>The eleven steps</h4>' +
      '<ul class="sumSteps">' + stepRows(ch, nature) + '</ul>' +
      '<p class="sumKey">● done &nbsp; ◐ part &nbsp; ○ not yet &nbsp; ' +
        '◆ leaves no artefact - attested by guards and the delivery note &nbsp; · not in this book</p>' +

      '<h4>What it left behind</h4>' +
      '<table class="sumParts"><tr><th>artefact</th><th>pts</th><th></th><th></th></tr>' +
        partRows(ch, nature) + '</table>' +

      '<h4>Guards <span class="sumN">' + (ch.guards || []).length + '</span></h4>' +
      '<p class="sumGuards">' + (ch.guards || []).map(g =>
        '<span>' + esc(g.replace(/^_v|\.html$/g, '')) + '</span>').join('') + '</p>' +

      (ch.handoverToNext
        ? '<h4>Handed to the next chapter</h4><div class="sumHand">' + hand(ch.handoverToNext) + '</div>'
        : '') +

      '<p class="sumFoot">The skill this was summarised with lives in ' +
        '<code>Summaries/courses/' + esc(nature.course) + '/skills.md</code></p>';
  };

  // The handover was written as markdown in the delivery note, so the
  // two marks it actually uses are honoured and nothing else is. A full
  // markdown reader here would be a second thing to keep correct for the
  // sake of emphasis in one paragraph
  const hand = text => '<p>' + esc(text)
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>') + '</p>';

  const head = (course, chapter) =>
    '<button class="sumX" type="button" aria-label="Close">×</button>' +
    '<div class="sumHead"><b>' + esc(course) + '</b><span>' + esc(chapter || 'chapter') + '</span></div>';

  document.addEventListener('click', e => {
    if (e.target.closest('.sumX')) { shut(); return; }
  });

  window.MyTermSummaryPane = { open, shut };
})();
