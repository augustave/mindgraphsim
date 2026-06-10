
// Intentionally no `import type` from './engine' here — that would drag engine.ts
// (legacy, not yet strict-clean) into the strict typecheck program. State shapes
// stay loose at the Window boundary; lab_view.ts can narrow at use sites.

export { };

declare global {
    // Build-time defines from vite.{site,engine}.config.ts. See those files
    // for the Vite `define` block that supplies these at bundle time.
    const __MGS_VERSION__: string;
    const __MGS_GIT_SHA__: string;
    const __MGS_BUILT_AT__: string;
}

declare global {
    interface Window {
        runBridgeRegressionTest: (steps: number, callback?: unknown) => void;
        runBaselineScenario: () => void;
        runT4Tests: () => void;
        generateRunReport: () => void;
        runScenarioStep: (events: unknown[], stepIndex: number) => void;

        InputAdapter: unknown;
        Recorder: {
            start: () => void;
            stop: () => unknown;
            capture: (state: unknown) => void;
            getFrame: (index: number) => unknown;
            getMetadata: () => unknown;
            exportJSON: () => unknown;
            recording: boolean;
            buffer: unknown[];
            capacity: number;
        };
        ReplaySystem: unknown;
        NarrativeGenerator: unknown;

        applyModel: (id: string) => void;
        listModels: () => unknown[];
        MODEL_REGISTRY: unknown[];

        getCurrentContext: () => { profileId: string; frameId: string };

        // Engine Core. Kept as unknown at the Window boundary to avoid coupling
        // global.d.ts to engine.ts; consumers (lab_view.ts) can use the directly
        // imported state/physicsConfig/hudMetrics which carry real inferred types.
        state: unknown;
        patternIdCounter: number;
        hudMetrics: unknown;
        physicsConfig: unknown;

        // Aggregated namespace added in S7.2; mirrors the individual exports above.
        MGS: Record<string, unknown>;

        loadScene: (id: string) => void;
        applyProfile: (id: string) => void;
        applyFrame: (id: string) => void;

        // Physics Loop (exposed for testing)
        integratePhysics: (dt: number) => void;
        applySemanticPositionalBias: () => void;
        applyPatternInfluence: () => void;
        updateEnergyStress: (dt: number) => void;
        ambientStep: (dt: number) => void;
        activationStep: (dt: number) => void;
        detectPatterns: () => void;
        runLevinPatternDetectors: () => void;
        updateHUDMetrics: () => void;

        // S7.1 UI hooks
        drawGraph: () => void;
        resizeCanvas: () => void;

        // Lab-view namespace
        lab: Record<string, unknown>;
    }
}
