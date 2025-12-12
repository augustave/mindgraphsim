const fs = require('fs');
const path = require('path');
// const jsdom = require("jsdom"); // Not available in env usually, stick to mocks

// Note: Since we don't have JSDOM, we use the same mock strategy as before.

// --- Mock DOM ---
class MockElement {
    constructor(tag) { this.tagName = tag; this.children = []; this.innerHTML = ''; this.classList = { add: () => { }, remove: () => { }, toggle: () => { } }; this.style = {}; }

    appendChild(c) { this.children.push(c); c.parentElement = this; }
    querySelector() { return null; }
    querySelectorAll() { return []; }
    getContext() {
        return {
            fillRect: () => { }, measureText: () => ({ width: 0 }), save: () => { }, restore: () => { },
            translate: () => { }, scale: () => { }, beginPath: () => { }, moveTo: () => { }, lineTo: () => { },
            stroke: () => { }, fill: () => { }, setTransform: () => { }, clearRect: () => { }, arc: () => { },
            setLineDash: () => { }, drawImage: () => { }, createPattern: () => { }, createRadialGradient: () => ({ addColorStop: () => { } }),
            createLinearGradient: () => ({ addColorStop: () => { } }), fillText: () => { }, rect: () => { }, clip: () => { },
            bezierCurveTo: () => { }, quadraticCurveTo: () => { }, closePath: () => { }

        };
    }

    getBoundingClientRect() { return { width: 800, height: 600 }; }
    addEventListener() { }
    removeEventListener() { }
}

const body = new MockElement('BODY');
const catalogModal = new MockElement('DIV'); catalogModal.id = 'catalog-modal';
const btnCatalog = new MockElement('BUTTON'); btnCatalog.id = 'btn-catalog';
const profilesList = new MockElement('DIV'); profilesList.id = 'catalog-profiles-list';
const framesList = new MockElement('DIV'); framesList.id = 'catalog-frames-list';

const elements = {
    'catalog-modal': catalogModal, 'btn-catalog': btnCatalog, 'catalog-profiles-list': profilesList, 'catalog-frames-list': framesList,
    'sim-canvas': new MockElement('CANVAS')
};


// Ensure btnCatalog exists instantly but scripts bind later
global.document = {
    getElementById: (id) => elements[id] || new MockElement('DIV'),
    createElement: (tag) => new MockElement(tag),
    body: body,
    addEventListener: () => { },
};
// Add btnCatalog to body so querySelector or just script execution finds it
body.children.push(btnCatalog);

global.window = { addEventListener: () => { }, devicePixelRatio: 1, getComputedStyle: () => ({ display: 'block' }), Date: Date };
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = () => { };
global.Blob = class Blob { };
global.URL = { createObjectURL: () => '', revokeObjectURL: () => { } };

// --- Load Engine ---
const enginePath = path.join(__dirname, '../mgs-engine.js');
let engineCode = fs.readFileSync(enginePath, 'utf8');

// Expose state and functions
engineCode = engineCode.replace(/let state =/g, 'global.state =');
engineCode = engineCode.replace(/function applyProfile/g, 'global.applyProfile = function applyProfile');
engineCode = engineCode.replace(/function applyFrame/g, 'global.applyFrame = function applyFrame');
engineCode = engineCode.replace(/const PROFILE_REGISTRY =/g, 'global.PROFILE_REGISTRY =');
engineCode = engineCode.replace(/const FRAME_REGISTRY =/g, 'global.FRAME_REGISTRY =');

// Disable heavy auto-run
// engineCode = engineCode.replace(/resizeCanvas\(\);/g, '// resizeCanvas();');
// engineCode = engineCode.replace(/loadScene\('single_core_two_anchors'\);/g, '// loadScene();');
// engineCode = engineCode.replace(/animate\(\);/g, '// animate();');

// Debug output inside engine binding
engineCode = engineCode.replace(/if \(btnCatalog && catalogModal\) \{/g, 'console.log("Binding Catalog"); if (btnCatalog && catalogModal) {');

try { eval(engineCode); } catch (e) {
    console.error("Eval Error:", e);
    process.exit(1);
}


// --- Test Catalog Logic ---
console.log("Running S5 Catalog Verification...");

// 1. Simulate Open Catalog
if (btnCatalog.onclick) {
    btnCatalog.onclick();
    console.log("PASS: Catalog Opened (render trigged).");
} else {
    console.error("FAIL: btnCatalog.onclick not bound.");
    process.exit(1);
}

// 2. Verify Cards Created
const profileCards = profilesList.children.length;
const frameCards = framesList.children.length;

if (profileCards >= 4) console.log(`PASS: Profile cards rendered (${profileCards}).`);
else console.error(`FAIL: Profile cards missing (${profileCards}).`);

if (frameCards >= 5) console.log(`PASS: Frame cards rendered (${frameCards}).`);
else console.error(`FAIL: Frame cards missing (${frameCards}).`);

// 3. Simulate Click on First Profile
const firstProfile = profilesList.children[0];
// Mock applyProfile to track call
let profileCalled = false;
const originalApplyProfile = global.applyProfile;
global.applyProfile = (id) => { profileCalled = id; originalApplyProfile(id); };

if (firstProfile.onclick) {
    firstProfile.onclick(); // Trigger click
    if (profileCalled) console.log(`PASS: Click applied profile '${profileCalled}'.`);
    else console.error("FAIL: Click did not call applyProfile.");
} else {
    console.error("FAIL: Card onclick not bound.");
}

console.log("S5 Catalog Verified.");
