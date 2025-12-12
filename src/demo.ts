// MindGraphSim Demo
import { createMindGraphSim, createTestGraph } from './index';

// Initialize
const { sim, viz } = createMindGraphSim({
  profile_id: 'autistic_intense_connectivity',
});

createTestGraph(sim);

// DOM elements
const btnStep = document.getElementById('btn-step') as HTMLButtonElement;
const btnRun = document.getElementById('btn-run') as HTMLButtonElement;
const btnRun100 = document.getElementById('btn-run-100') as HTMLButtonElement;
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
const btnNoise = document.getElementById('btn-noise') as HTMLButtonElement;
const profileSelect = document.getElementById('profile-select') as HTMLSelectElement;

const statStep = document.getElementById('stat-step')!;
const statObjects = document.getElementById('stat-objects')!;
const statPatterns = document.getElementById('stat-patterns')!;
const statOverloads = document.getElementById('stat-overloads')!;
const statKE = document.getElementById('stat-ke')!;
const statActivation = document.getElementById('stat-activation')!;

const asciiView = document.getElementById('ascii-view')!;
const logView = document.getElementById('log')!;

let lastOverloadCount = 0;
let lastRecoveryCount = 0;
let lastPatternCount = 0;

function updateUI() {
  const state = sim.getState();
  const telemetry = sim.getLatestTelemetry();

  // Stats
  statStep.textContent = state.step.toString();
  statObjects.textContent = state.objects.size.toString();
  statPatterns.textContent = state.patterns.size.toString();
  statOverloads.textContent = state.overload_events.length.toString();
  statKE.textContent = telemetry?.total_kinetic_energy.toFixed(2) ?? '0';
  statActivation.textContent = telemetry?.total_activation.toFixed(2) ?? '0';

  // ASCII view
  const ascii = viz.generateASCIIView(state, 80, 20);
  asciiView.textContent = ascii.join('\n');

  // Log new events
  if (state.overload_events.length > lastOverloadCount) {
    const newEvents = state.overload_events.slice(lastOverloadCount);
    for (const event of newEvents) {
      addLog(`Overload: ${event.trigger_object_id} severed ${event.severed_edges.length} edges`, 'overload');
    }
    lastOverloadCount = state.overload_events.length;
  }

  if (state.recovery_events.length > lastRecoveryCount) {
    const newEvents = state.recovery_events.slice(lastRecoveryCount);
    for (const event of newEvents) {
      addLog(`Recovery: edge ${event.edge_id} healed`, 'recovery');
    }
    lastRecoveryCount = state.recovery_events.length;
  }

  if (state.patterns.size > lastPatternCount) {
    const patterns = Array.from(state.patterns.values());
    const newPatterns = patterns.slice(lastPatternCount);
    for (const pattern of newPatterns) {
      addLog(`Pattern: ${pattern.type} "${pattern.archetype}" with ${pattern.member_ids.length} members`, 'pattern');
    }
    lastPatternCount = state.patterns.size;
  }
}

function addLog(message: string, type: 'step' | 'overload' | 'recovery' | 'pattern' = 'step') {
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = `[${sim.getState().step}] ${message}`;
  logView.insertBefore(entry, logView.firstChild);

  // Limit log size
  while (logView.children.length > 100) {
    logView.removeChild(logView.lastChild!);
  }
}

// Event handlers
btnStep.addEventListener('click', () => {
  sim.step();
  updateUI();
});

btnRun.addEventListener('click', () => {
  sim.run(10);
  updateUI();
});

btnRun100.addEventListener('click', () => {
  sim.run(100);
  updateUI();
});

btnReset.addEventListener('click', () => {
  sim.reset();
  createTestGraph(sim);
  lastOverloadCount = 0;
  lastRecoveryCount = 0;
  lastPatternCount = 0;
  logView.innerHTML = '';
  addLog('Simulation reset', 'step');
  updateUI();
});

btnNoise.addEventListener('click', () => {
  sim.getAmbientEngine().injectNoise(sim.getState().ambient_field, 0.2);
  addLog('Injected noise (+0.2)', 'step');
  updateUI();
});

profileSelect.addEventListener('change', () => {
  sim.setProfile(profileSelect.value);
  addLog(`Profile changed to: ${profileSelect.value}`, 'step');
});

// Initial render
addLog('MindGraphSim initialized', 'step');
addLog(`Profile: ${sim.getProfile().name}`, 'step');
addLog(`Objects: ${sim.getState().objects.size}`, 'step');
updateUI();
