// WILWATIKTA 3D — missions, objectives, timers and dialogue.
(function () {
  'use strict';
  const CITY = window.WTW.city;

  function newRun() {
    return {
      mission: 5, // Balapan Senja (index 5) — the chase shot's mission.
      checkpoint: 0, checkpointsTotal: 4,
      timer: 193, // seconds left
      done: [0, 1, 2, 3, 4], // missions 1-5 complete
      active: 5,
      next: 'GUDANG SEGARA',
      dialogue: { who: 'AGUS', role: 'DRIVER · GETAWAY', text: 'Balapannya dari Pantai Kidul. Jangan rem di tikungan.' },
      passed: null, // {name, pay} when a mission completes
    };
  }

  function missionText(run) {
    const m = CITY.MISSIONS[run.mission];
    return {
      title: 'MISSION ' + (run.mission + 1) + '/12 — ' + m.name.toUpperCase(),
      body: 'Checkpoint ' + (run.checkpoint + 1) + ' of ' + run.checkpointsTotal + ': ' + m.text,
      pay: m.pay,
    };
  }

  function fmtTimer(sec) {
    const s = Math.max(0, Math.ceil(sec));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function advanceCheckpoint(run) {
    run.checkpoint++;
    if (run.checkpoint >= run.checkpointsTotal) {
      const m = CITY.MISSIONS[run.mission];
      run.passed = { name: m.name, pay: m.pay };
      run.done.push(run.mission);
      run.mission = (run.mission + 1) % CITY.MISSIONS.length;
      run.checkpoint = 0;
      run.timer = 240;
      run.active = run.mission;
      run.next = CITY.MISSIONS[(run.mission + 1) % CITY.MISSIONS.length].name.toUpperCase();
      const next = CITY.MISSIONS[run.mission];
      run.dialogue = { who: 'RATNA', role: 'HACKER', text: next.line };
      return true;
    }
    return false;
  }

  // Dialogue lines per speaker, cycled by mission index.
  function lineFor(missionIdx, speaker) {
    const m = CITY.MISSIONS[missionIdx % CITY.MISSIONS.length];
    return { who: speaker, role: speaker === 'AGUS' ? 'DRIVER · GETAWAY' : speaker === 'RATNA' ? 'HACKER' : 'CREW', text: m.line };
  }

  window.WTW.missions = { newRun, missionText, fmtTimer, advanceCheckpoint, lineFor };
})();
