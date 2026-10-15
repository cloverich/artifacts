/* Original fictional fixtures. Dates stay fixed so screenshots remain reproducible. */
(() => {
  'use strict';
  const DAY = 86_400_000;
  const end = Date.UTC(2026, 9, 15);
  const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const daily = Array.from({ length: 180 }, (_, i) => {
    const date = new Date(end - (179 - i) * DAY);
    const weekend = [0, 6].includes(date.getUTCDay());
    // Completed agent invocations, including occasional verification/retry runs.
    const runs = i >= 175 ? 3 : weekend ? 3 : 3 + ((i * 17 + 11) % 5);
    return { date, runs, commits: weekend ? i % 3 : 2 + ((i * 13 + 7) % 6), fixes: 0, open: null };
  });

  // Closed ledger: 78 baseline + 17 new findings - 89 fixes = 6 remaining.
  let remaining = 78;
  daily.slice(-90).forEach((day, i) => {
    const discovered = i > 0 && i % 5 === 0 ? 1 : 0;
    day.open = 78 - Math.round(72 * (i + 1) / 90);
    day.fixes = remaining + discovered - day.open;
    day.discovered = discovered;
    remaining = day.open;
  });
  for (const [metric, field] of [['runs', 'runs'], ['commits', 'commits'], ['fixes', 'fixes']]) {
    for (const window of [7, 30]) {
      document.getElementById(`${metric}-${window}`).textContent = daily.slice(-window).reduce((sum, day) => sum + day[field], 0);
    }
  }

  const heatmap = document.getElementById('heatmap');
  const readout = document.getElementById('heatmap-readout');
  const startOffset = (daily[0].date.getUTCDay() + 6) % 7;
  const weeks = Math.ceil((startOffset + daily.length) / 7);
  heatmap.style.setProperty('--weeks', weeks);
  let previousMonth = -1;
  const fragment = document.createDocumentFragment();
  daily.forEach((day, index) => {
    const col = Math.floor((index + startOffset) / 7) + 2;
    const row = (index + startOffset) % 7 + 2;
    if (day.date.getUTCMonth() !== previousMonth) {
      // The partial first month is represented by the date-range caption.
      if (index > 0) {
        const label = document.createElement('span');
        label.className = 'month-label';
        label.textContent = day.date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
        label.style.gridColumn = col;
        label.style.gridRow = 1;
        fragment.append(label);
      }
      previousMonth = day.date.getUTCMonth();
    }
    const cell = document.createElement('span');
    const level = Math.min(4, Math.max(1, day.runs - 2));
    cell.className = `heat-cell level-${level}`;
    cell.style.gridColumn = col;
    cell.style.gridRow = row;
    const label = `${dateFormat.format(day.date)}: ${day.runs} completed runs · ${day.commits} commits`;
    cell.title = label;
    cell.addEventListener('pointerenter', () => { readout.textContent = label; });
    fragment.append(cell);
  });
  for (const [label, row] of [['M', 2], ['W', 4], ['F', 6]]) {
    const dayLabel = document.createElement('span');
    dayLabel.className = 'day-label';
    dayLabel.textContent = label;
    dayLabel.style.gridColumn = 1;
    dayLabel.style.gridRow = row;
    fragment.append(dayLabel);
  }
  heatmap.append(fragment);
  heatmap.addEventListener('pointerleave', () => { readout.textContent = '19 Apr — 15 Oct 2026'; });
  const activityTotal = daily.reduce((sum, day) => sum + day.runs, 0);
  document.getElementById('activity-total').textContent = `${activityTotal} runs`;
  heatmap.setAttribute('aria-label', `${activityTotal} completed agent runs from April 19 to October 15, 2026. Weekdays generally have more activity than weekends.`);

  // SVG keeps the small plot sharp without a charting runtime or canvas loop.
  const chartDays = daily.slice(-90);
  const width = 500, height = 150, left = 27, right = 21, top = 10, bottom = 27;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const x = i => left + plotWidth * i / 89;
  const y = value => top + plotHeight * (1 - value / 80);
  const points = chartDays.map((day, i) => `${x(i).toFixed(2)},${y(day.open).toFixed(2)}`);
  const line = `M${points.join(' L')}`;
  const area = `${line} L${x(89)},${y(0)} L${x(0)},${y(0)} Z`;
  const grid = [80, 40, 0].map(value => `<line x1="${left}" x2="${width - right}" y1="${y(value)}" y2="${y(value)}" stroke="${value === 0 ? '#46563c' : '#273026'}" stroke-dasharray="${value === 0 ? '3 4' : '2 5'}"/><text class="chart-axis" x="0" y="${y(value) + 3}">${value}</text>`).join('');
  const ticks = [[0, '18 Jul', 'start'], [30, '17 Aug', 'middle'], [60, '16 Sep', 'middle'], [89, '15 Oct', 'end']].map(([i, label, anchor]) => `<text class="chart-axis" x="${x(i)}" y="${height - 5}" text-anchor="${anchor}">${label}</text>`).join('');
  document.getElementById('burndown').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="burndown-svg-title burndown-svg-desc"><title id="burndown-svg-title">Open vulnerabilities over ninety days</title><desc id="burndown-svg-desc">Open findings fell from a baseline of 78 to 6 between July 18 and October 15, 2026. 17 new findings and 89 fixes are included. The dashed line is the target of zero.</desc><defs><linearGradient id="burndown-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8d581" stop-opacity=".15"/><stop offset="1" stop-color="#a8d581" stop-opacity=".01"/></linearGradient></defs>${grid}<path d="${area}" fill="url(#burndown-fill)"/><path d="${line}" fill="none" stroke="#c6ee9f" stroke-width="1.6" stroke-linejoin="round"/><circle cx="${x(89)}" cy="${y(6)}" r="3.2" fill="#c6ee9f" stroke="#111512" stroke-width="2"/><text x="${x(89) + 9}" y="${y(6) - 3}" fill="#c6ee9f" font-size="10" font-family="monospace">6</text>${ticks}</svg>`;

  const agents = {
    dependency: { name: 'Dependency tracker', short: 'Dependencies' },
    vulnerability: { name: 'Vulnerability tracker', short: 'Security' },
    rails: { name: 'Rails 7 migration', short: 'Rails 7' },
  };
  const runs = [
    { agent: 'rails', date: '2026-10-15', start: '09:04', duration: '38m 12s', outcome: 'Session policy flagged', ticket: 'eng-342', refs: ['pr-479', 'pr-486'], text: 'Migrated two controller components and brought the dual-version suite to 18 of 24 passing components. Opened the request/session compatibility PR. Left the session-default policy for maintainer review and recorded the next controller targets in current state.' },
    { agent: 'vulnerability', date: '2026-10-15', start: '09:09', duration: '22m 08s', outcome: 'Patch ready for review', ticket: 'sec-218', refs: ['pr-484', 'pr-485'], text: 'Reproduced the archive-extraction finding, prepared a minimal patch, and added a regression case. Rechecked the upstream parser release; the patch is still pending. Updated the remaining-findings ledger and retained the temporary mitigation.' },
    { agent: 'dependency', date: '2026-10-15', start: '09:00', duration: '18m 34s', outcome: 'Two minor updates opened', refs: ['pr-482', 'pr-483', 'commit-7c91e0a'], text: 'Merged the verified patch batch. Opened separate job-client and build-tool updates, then ran the unit suite. Browser checks remain in progress. Wrote the CI follow-up and merge criteria into the dependency handoff.' },
    { agent: 'rails', date: '2026-10-14', start: '09:03', duration: '42m 06s', outcome: 'Autoloader fixes verified', ticket: 'eng-337', refs: ['pr-479'], text: 'Resolved autoloader naming mismatches in the mailer and job namespaces. The dual-version suite is green for those components. Prepared the compatibility patch for review and documented the remaining request/session failures.' },
    { agent: 'vulnerability', date: '2026-10-14', start: '09:02', duration: '16m 51s', outcome: 'Advisory scan reconciled', refs: ['commit-a3b07fd'], text: 'Reconciled the lockfile scan against deployed artifacts, checked the mitigation, and verified the previous patch. Kept unresolved transitive findings open with their dependency paths documented.' },
    { agent: 'dependency', date: '2026-10-14', start: '09:00', duration: '12m 09s', outcome: 'Patch batch landed', refs: ['pr-477'], text: 'Completed the compatibility checks for the patch batch and merged it after all required checks passed. Recorded the exact package versions and excluded a major-version release from the automatic queue.' },
    { agent: 'rails', date: '2026-10-13', start: '09:04', duration: '51m 22s', outcome: 'Mailer compatibility added', ticket: 'eng-337', refs: ['pr-475'], text: 'Updated mailer test configuration for the dual Rails matrix. Preserved current delivery behavior, verified the notification fixtures, and queued the autoloader namespace cleanup for the next run.' },
    { agent: 'vulnerability', date: '2026-10-13', start: '09:02', duration: '24m 18s', outcome: 'Transitive patch verified', refs: ['pr-474'], text: 'Updated a transitive dependency through its direct parent and verified the lockfile diff. Confirmed that the patched version is included in the build artifact before marking the finding fixed.' },
    { agent: 'dependency', date: '2026-10-13', start: '09:00', duration: '14m 43s', outcome: 'Update queue refreshed', refs: ['pr-477'], text: 'Refreshed the release inventory, grouped compatible patch updates, and opened a small reviewable batch. Deferred the job-client minor update until it could be tested independently of the Rails branch.' },
    { agent: 'rails', date: '2026-10-12', start: '09:03', duration: '36m 40s', outcome: 'Background jobs migrated', refs: ['pr-471'], text: 'Migrated the background-job adapters and verified serialization compatibility. Added the passing components to the migration ledger and retained the old queue payload format during the rollout.' },
    { agent: 'vulnerability', date: '2026-10-12', start: '09:01', duration: '19m 05s', outcome: 'Mitigation checked', ticket: 'sec-218', refs: ['pr-470'], text: 'Verified that the temporary parser mitigation remains active in the build configuration. Rechecked the upstream issue and prepared the next transitive dependency fix without weakening the existing guard.' },
    { agent: 'dependency', date: '2026-10-12', start: '09:00', duration: '11m 26s', outcome: 'Lockfile drift resolved', refs: ['pr-469'], text: 'Resolved lockfile drift from a recently merged patch and reran the dependency audit. The manifest and resolved versions agree; no major updates were introduced.' },
    { agent: 'rails', date: '2026-10-11', start: '09:03', duration: '47m 31s', outcome: 'Dual-version CI restored', ticket: 'eng-331', refs: ['pr-466'], text: 'Restored the dual-version test matrix and isolated unrelated flaky tests. Added the model layer to the migrated-component ledger and identified background jobs as the next independent slice.' },
    { agent: 'vulnerability', date: '2026-10-11', start: '09:01', duration: '21m 14s', outcome: 'Regression checks passed', refs: ['pr-465'], text: 'Ran regression checks against the latest security patch and confirmed the advisory no longer reproduces. Updated the findings ledger with the deployed version and retained the verification notes.' },
    { agent: 'dependency', date: '2026-10-11', start: '09:00', duration: '9m 48s', outcome: 'Release inventory checked', refs: ['commit-c0e38b1'], text: 'Checked eligible releases and validated the existing update queue. No additional safe patch updates were available. Recorded the next check and left the working tree clean.' },
  ];
  // Current state is the end time, so the history uses completion order.
  const completionMinutes = run => {
    const [h, m] = run.start.split(':').map(Number);
    const [minutes, seconds] = run.duration.match(/\d+/g).map(Number);
    return Date.parse(`${run.date}T00:00:00Z`) / 60_000 + h * 60 + m + minutes + seconds / 60;
  };
  runs.sort((a, b) => completionMinutes(b) - completionMinutes(a));

  const work = {
    'pr-482': ['PR #482 · Job-client minor bump', 'Open · CI running', 'An isolated minor-version upgrade for the background-job client. Unit checks pass; the required browser checks are still running.'],
    'pr-483': ['PR #483 · Build-tool updates', 'Open · CI running', 'A compatible frontend tooling update. Kept separate from the runtime dependency changes for a smaller review surface.'],
    'pr-484': ['PR #484 · Harden archive extraction', 'Open · Needs review', 'A minimal security fix with a regression case. Ready for maintainer review before merge and deployment.'],
    'pr-485': ['PR #485 · Transitive parser patch', 'Open · CI running', 'Updates a direct parent to pick up the patched transitive dependency. Full compatibility checks are in progress.'],
    'pr-479': ['PR #479 · Autoloader compatibility', 'Open · Needs review', 'Rails 7 namespace and autoloader compatibility fixes. The relevant dual-version test matrix is green.'],
    'pr-486': ['PR #486 · Request/session specs', 'Open · CI running', 'Isolates request/session compatibility changes. The behavior-changing session defaults remain gated on ENG-342.'],
    'eng-342': ['ENG-342 · Session rollout policy', 'Decision needed · Rails 7 migration', 'Choose whether existing sessions should be preserved through the Rails 7 cookie-default transition. The agent is continuing independent controller work while this decision waits.'],
    'sec-218': ['SEC-218 · Upstream parser patch', 'Waiting on upstream · Mitigation active', 'Tracks the remaining high-severity upstream finding. Recheck the patched release on the next security run; retain the mitigation until deployment is verified.'],
    'eng-337': ['ENG-337 · Autoloader and mailer compatibility', 'In review · Rails 7 migration', 'Bring job and mailer namespaces into alignment with the Rails 7 autoloader and verify behavior in both supported framework versions.'],
    'eng-331': ['ENG-331 · Dual-version test matrix', 'Done · Rails 7 migration', 'Restore reliable CI coverage of both framework versions so migration slices can be evaluated independently.'],
    'commit-7c91e0a': ['7c91e0a · Merge patch batch', 'Committed to main · 15 Oct 2026', 'The verified patch batch landed after required checks passed. The dependency tracker recorded the new resolved versions.'],
    'commit-a3b07fd': ['a3b07fd · Reconcile advisory ledger', 'Committed to main · 14 Oct 2026', 'Refreshes the findings ledger against deployed artifacts and preserves the dependency paths for unresolved transitive findings.'],
    'commit-c0e38b1': ['c0e38b1 · Refresh release inventory', 'Committed to main · 11 Oct 2026', 'Records the eligible-release inventory and the outcome of the dependency check.'],
  };
  const refLabel = id => id.startsWith('pr-') ? `PR #${id.slice(3)}` : id.startsWith('commit-') ? id.slice(7) : id.toUpperCase();
  const records = document.getElementById('run-records');
  runs.forEach((run, index) => {
    const details = document.createElement('details');
    details.className = 'run-record';
    details.dataset.agent = run.agent;
    const date = dateFormat.format(new Date(`${run.date}T12:00:00Z`));
    const ticket = run.ticket ? `<a class="run-ticket" href="#${run.ticket}" data-ref="${run.ticket}">${refLabel(run.ticket)}</a>` : '<span class="run-ticket no-ticket">—</span>';
    details.innerHTML = `<summary><span class="run-identity"><span class="run-dot" aria-hidden="true"></span><span class="run-agent">${agents[run.agent].name}</span><span class="run-summary">${run.outcome}</span></span><time class="run-start" datetime="${run.date}T${run.start}:00-07:00">${date}<span>${run.start}</span></time><span class="run-duration">${run.duration}</span>${ticket}<span class="chevron" aria-hidden="true">+</span></summary><div class="run-body"><div><div class="eyebrow">RUN ${String(418 - index).padStart(4, '0')} · ${run.outcome.toUpperCase()}</div><p>${run.text}</p></div><div class="run-artifacts">${[...run.refs, ...(run.ticket ? [run.ticket] : [])].map(id => `<a href="#${id}" data-ref="${id}">${refLabel(id)} ↗</a>`).join('')}</div></div>`;
    records.append(details);
    run.refs.forEach(id => {
      if (!work[id]) work[id] = [`${refLabel(id)} · ${run.outcome}`, 'Merged · Checks passed', run.text];
    });
  });

  document.getElementById('agent-filter').addEventListener('change', event => {
    let count = 0;
    records.querySelectorAll('details').forEach(record => {
      record.hidden = event.target.value !== 'all' && event.target.value !== record.dataset.agent;
      if (!record.hidden) count++;
    });
    document.getElementById('run-count').textContent = `${count} RUNS`;
  });

  const dialog = document.getElementById('work-dialog');
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-ref]');
    if (!link) return;
    event.preventDefault();
    event.stopPropagation();
    const item = work[link.dataset.ref];
    if (!item) return;
    document.getElementById('work-title').textContent = item[0];
    document.getElementById('work-status').textContent = item[1];
    document.getElementById('work-description').textContent = item[2];
    dialog.showModal();
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
})();
