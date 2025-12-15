
export { };

declare global {
    interface Window {
        runBridgeRegressionTest: (steps: number, callback?: any) => void;
        runBaselineScenario: () => void;
        runT4Tests: () => void;
        generateRunReport: () => void;
        runScenarioStep: (events: any[], stepIndex: number) => void;

        InputAdapter: any;
        Recorder: {
            start: () => void;
            stop: () => any;
            capture: (state: any) => void;
            getFrame: (index: number) => any;
            getMetadata: () => any;
            exportJSON: () => any;
            recording: boolean;
            buffer: any[];
            capacity: number;
        };
        ReplaySystem: any;
        NarrativeGenerator: any;

        applyModel: (id: string) => void;
        listModels: () => any[];
        MODEL_REGISTRY: any[];

        getCurrentContext: () => { profileId: string; frameId: string };

        // Engine Core
        state: any;
        patternIdCounter: number;
        hudMetrics: any;
        physicsConfig: any;

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
        updateHUDMetrics: () => void;
    }
}
