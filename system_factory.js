// --- System Factory Module ---
// Import classes from their dedicated files
import { ConwayLife, BrianBrain } from './systems/cellular_automata.js';
import { LSystemTree, KochSnowflake } from './systems/l_system.js';
import { SlimeMold } from './systems/agent_system.js';
import { GenerativeSystem } from './base_system.js'; // Updated import

// --- Base System Class (Optional but good practice) ---
export class GenerativeSystem {
    constructor(width, height) {
       this.width = width;
       this.height = height;
        this.iteration = 0;
        // Define standard methods expected by lab.js
        this.name = "Base System";
   }
   step() { /* Implement in subclass */ this.iteration++; }
   reset() { /* Implement in subclass */ this.iteration = 0; }
   getParameters() { return []; /* Subclass should define params */ }
    getParamValue(paramId) { return undefined; /* Subclass implements */ }
    setParamValue(paramId, value) { /* Subclass implements */ }
    getIteration() { return this.iteration; }
    getPopulation() { return '-'; /* Subclass implements if applicable */ }
   getVisualizationHints() { return {}; /* Subclass provides render mode, cell size etc. */ }
   getInteractionHint() { return 'Observing'; /* Subclass provides interaction details */ }
   // Interaction handlers - optional, implement if system needs them
   handleMouseDown(x, y, button) {}
    handleMouseMove(x, y) {}
   handleMouseUp(x, y) {}
    onResize(newWidth, newHeight) { this.width = newWidth; this.height = newHeight; /* May need grid resize etc */ }
    destroy() { /* Optional cleanup */ }
    updateRendererBuffer(renderer) { /* Default: do nothing */ }
}

// --- Mapping from System ID to Class ---
const systemRegistry = {
    'ca_life': ConwayLife,
    'ca_brain': BrianBrain,          // NEW
    'l_system_tree': LSystemTree,
    'l_system_koch': KochSnowflake,  // NEW
    'agent_slime': SlimeMold         // NEW
};

// --- Factory Function ---
export function createSystemInstance(systemId, width, height) {
    const SystemClass = systemRegistry[systemId];
    if (SystemClass) {
        try {
            console.log(`Creating instance of ${SystemClass.name}...`);
            const instance = new SystemClass(width, height);
            instance.id = systemId;
            instance.iteration = instance.iteration || 0;
            if (typeof instance.step !== 'function') {
                console.warn(`System ${systemId} does not implement a step method.`);
            }
            return instance;
        } catch (e) {
            console.error(`Error constructing system ${systemId}:`, e);
            return null;
        }
    } else {
        console.warn(`System ID "${systemId}" not found in registry.`);
        return new GenerativeSystem(width, height);
    }
}
