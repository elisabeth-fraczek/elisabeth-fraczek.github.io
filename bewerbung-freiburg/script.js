// Funktionen der Bewerbungsseite
// Texte und Kontaktdaten: index.html | Gestaltung: style.css

(() => {
  'use strict';
  // Druck: Aufklappbare Stationen für den Ausdruck vorübergehend öffnen.
  const printButton = document.querySelector('[data-print]');
  let previouslyOpen = [];
  window.addEventListener('beforeprint', () => {
    previouslyOpen = [...document.querySelectorAll('details')]
      .map(el => [el, el.open]);
    previouslyOpen.forEach(([el]) => {
      el.open = true;
    });
  });
  window.addEventListener('afterprint', () =>
    previouslyOpen.forEach(([el, open]) => {
      el.open = open;
    })
  );
  printButton.addEventListener('click', () => window.print());

  // Lernbeispiel: Eine Registerkarte anzeigen und die übrigen ausblenden.
  // Die Inhalte selbst stehen in index.html.
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function selectTab(index, focus = false) {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = i !== index;
    });
    if (focus) tabs[index].focus();
  }
  // Bedienung per Mausklick sowie Pfeiltasten, Home und End.
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(index));
    tab.addEventListener('keydown', e => {
      let next;
      if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      else return;
      e.preventDefault();
      selectTab(next, true);
    });
  });

  // Optionales Spektren-Beispiel aus dem gemeinsamen Seitenskript.
  // Dieser Abschnitt läuft nur, wenn ein Element mit der ID spectrum-content existiert.
  const chart = document.getElementById('spectrum-content');
  if (!chart) return;
  // Synthetische Beispieldaten: Modell, Detektorantwort und Unsicherheiten.
  const rows = Array.from({length: 71}, (_, i) => {
    const wavelength = 450 + 5 * i;
    const reference =
      0.16 +
      0.9 * Math.exp(-0.5 * ((wavelength - 575) / 26) ** 2) +
      0.55 * Math.exp(-0.5 * ((wavelength - 650) / 39) ** 2);
    const response = 0.45 + 0.5 * (wavelength - 450) / 350;
    const measured =
      reference * response +
      0.014 * Math.sin(wavelength * 0.4) +
      0.01 * Math.cos(wavelength * 0.13);
    return {
      wavelength,
      reference,
      response,
      measured,
      corrected: measured / response,
      uMeasured: 0.025,
      uCorrected: 0.025 / response
    };
  });
  // Werte in SVG-Koordinaten umrechnen.
  const x = value => 57 + (value - 450) / 350 * 789;
  const y = value => 244 - value / 1.35 * 213;
  const path = (values, close = false) =>
    values.map((v, i) => `${i ? 'L' : 'M'}${x(v[0]).toFixed(2)},${y(v[1]).toFixed(2)}`).join(' ') + (close ? ' Z' : '');
  // Diagramm, Beschriftungen und Erläuterung für den gewählten Modus aktualisieren.
  function render(mode) {
    const corrected = mode === 'corrected';
    const key = corrected ? 'corrected' : 'measured';
    const uncertainty = corrected ? 'uCorrected' : 'uMeasured';
    const ticksX = [450,500,550,600,650,700,750,800];
    const ticksY = [0,0.3,0.6,0.9,1.2];
    const grid = ticksY.map(t => `<line x1="57" y1="${y(t)}" x2="846" y2="${y(t)}" stroke="#e7ece8"/><text x="44" y="${y(t)+3}" text-anchor="end" fill="#53666a" font-size="10">${t.toFixed(1)}</text>`).join('');
    const ticks = ticksX.map(t => `<text x="${x(t)}" y="263" text-anchor="middle" fill="#53666a" font-size="10">${t}</text>`).join('');
    const band = [
      ...rows.map(r => [r.wavelength, r[key] + r[uncertainty]]),
      ...[...rows].reverse().map(r => [r.wavelength, r[key] - r[uncertainty]])
    ];
    chart.innerHTML = `${grid}${ticks}<text x="57" y="16" font-size="10" fill="#53666a">Signal / a.u.</text><text x="846" y="284" text-anchor="end" font-size="10" fill="#53666a">Wellenlänge / nm</text><path d="${path(band,true)}" fill="#d8ebe4"/><path d="${path(rows.map(r => [r.wavelength,r.reference]))}" fill="none" stroke="#869795" stroke-width="1.8" stroke-dasharray="5 4"/><path d="${path(rows.map(r => [r.wavelength,r[key]]))}" fill="none" stroke="#14766a" stroke-width="2.3" stroke-linejoin="round"/>`;
    document.querySelectorAll('[data-mode]').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.mode === mode))
    );
    document.getElementById('series-label').textContent = corrected
      ? 'Korrigiertes Signal' : 'Messsignal';
    document.getElementById('spectrum-title').textContent = corrected
      ? 'Korrigiertes synthetisches Spektrum mit Unsicherheitsband' : 'Synthetisches Rohsignal mit Unsicherheitsband';
    document.getElementById('demo-state-heading').textContent = corrected
      ? 'Was zeigt die Korrektur?' : 'Was ist im Rohsignal enthalten?';
    document.getElementById('demo-state-copy').textContent = corrected
      ? 'Nach Division durch die bekannte Detektorantwort nähert sich das Signal der Modellreferenz. Das Unsicherheitsband wird dort breiter, wo die Detektorantwort kleiner ist.' : 'Das Ausgangsspektrum wird durch die bekannte Detektorantwort abgeschwächt. Die Form des Messsignals allein beschreibt deshalb noch nicht das Ausgangsspektrum.';
  }
  // Schaltflächen für Rohsignal und korrigiertes Signal.
  document.querySelectorAll('[data-mode]').forEach(button =>
    button.addEventListener('click', () => render(button.dataset.mode))
  );
  // CSV-Download: Spalten und Dateiname lassen sich hier anpassen.
  document.getElementById('download-data').addEventListener('click', () => {
    const keys = ['wavelength','reference','response','measured','corrected','uMeasured','uCorrected'];
    const header = 'wavelength_nm,model_reference_au,detector_response,measured_signal_au,corrected_signal_au,u_measured_au,u_corrected_au';
    const csv = [header, ...rows.map(row => keys.map(key => row[key].toFixed(8)).join(','))].join('\n') + '\n';
    const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'illustratives-spektrum-synthetische-daten.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  render('raw');
})();
