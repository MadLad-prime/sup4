// --- System Factory Module ---
// Import classes from their dedicated files
import { ConwayLife, BrianBrain } from './systems/cellular_automata.js';
import { LSystemTree, KochSnowflake } from './systems/l_system.js';
import { SlimeMold } from './systems/agent_system.js';

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

// --- Placeholder L-System ---
// Note: Full L-system parsing and turtle graphics is quite complex
// This will be a simplified version generating direct line segments
class LSystemTree extends GenerativeSystem {
   constructor(width, height) {
       super(width, height);
        this.name = "L-System Tree";
        this.lines = [];
        // --- L-System Parameters ---
        this.axiom = 'X';
        this.rules = { 'X': 'F+[[X]-X]-F[-FX]+X', 'F': 'FF' }; // A common fractal plant rule
        this.angle = 25; // Degrees
        this.iterations = 4; // Start with fewer iterations
        this.currentString = '';
        this.initialLength = height * 0.15;
        this.lengthFactor = 0.6;
        this.initialThickness = 6;
    }

   reset() {
       super.reset();
       this.lines = [];
       this.generateSystem();
       this.interpretSystem();
    }

    // Generate the L-system string
    generateSystem() {
       this.currentString = this.axiom;
       for (let i = 0; i < this.iterations; i++) {
           let nextString = '';
            for (const char of this.currentString) {
                nextString += this.rules[char] || char; // Apply rule or keep char
           }
           this.currentString = nextString;
        }
        // console.log(`L-System string (len ${this.currentString.length}) generated for ${this.iterations} iterations`);
    }

   // Interpret the string using turtle graphics logic -> create line segments
    interpretSystem() {
       this.lines = []; // Clear previous lines
       const turtleStack = []; // Stack for saving state [x, y, angle, len, thickness]
        let current = {
           x: this.width / 2,
           y: this.height,
            angle: -Math.PI / 2, // Start pointing up
            len: this.initialLength / Math.pow(this.iterations, 0.9), // Scale length based on iterations
            thickness: this.initialThickness
       };
        const angleRad = degreesToRadians(this.angle);

        for (const char of this.currentString) {
           switch (char) {
                case 'F': // Move forward, draw line
                   const nextX = current.x + Math.cos(current.angle) * current.len;
                   const nextY = current.y + Math.sin(current.angle) * current.len;
                    this.lines.push({ x1: current.x, y1: current.y, x2: nextX, y2: nextY, thickness: Math.max(0.5, current.thickness), leafInfo: { type: 'none' } }); // Add leaf info later maybe
                   current.x = nextX;
                   current.y = nextY;
                   break;
               case '+': // Turn right
                   current.angle += angleRad * (Math.random() * 0.4 + 0.8); // Add variation
                   break;
               case '-': // Turn left
                   current.angle -= angleRad * (Math.random() * 0.4 + 0.8); // Add variation
                    break;
               case '[': // Push state
                   turtleStack.push({ ...current });
                   // Optionally modify pushed state slightly (e.g., reduce length/thickness faster)
                   current.len *= this.lengthFactor * (Math.random() * 0.2 + 0.9);
                    current.thickness *= 0.75;
                   break;
                case ']': // Pop state
                    if (turtleStack.length > 0) {
                       // Maybe add a 'leaf' here on pop if desired
                       if (this.lines.length > 0) this.lines[this.lines.length - 1].leafInfo = { type: 'circle', size: Math.max(1, current.thickness * 1.2), color: 'hsl(110, 70%, 80%)' };
                        current = turtleStack.pop();
                    }
                   break;
               // Ignore other characters like X
           }
       }
        console.log(`Generated ${this.lines.length} line segments for L-System.`);
    }

    getLines() { return this.lines; }
   getVisualizationHints() { return { renderMode: 'lines', lineWidthFactor: 0.5 + (this.iterations / 8) * 0.8 }; } // Scale line width based on iterations
   getInteractionHint() { return 'Observing L-System Growth'; }

    getParameters() {
       return [
           { id: 'iterations', label: 'Iterations', type: 'slider', min: 1, max: 7, step: 1, value: this.iterations, tooltip: 'Number of recursive steps' },
            { id: 'angle', label: 'Angle (°)', type: 'slider', min: 5, max: 60, step: 1, value: this.angle, tooltip: 'Base branching angle' },
           { id: 'axiom', label: 'Axiom', type: 'text', value: this.axiom, tooltip: 'Starting symbol string' },
           { id: 'ruleF', label: 'Rule (F)', type: 'text', value: this.rules['F'], tooltip: 'Replacement rule for F' },
           { id: 'ruleX', label: 'Rule (X)', type: 'text', value: this.rules['X'], tooltip: 'Replacement rule for X' }
           // Could add length factor etc.
       ];
    }
    getParamValue(paramId) {
       switch (paramId) {
           case 'iterations': return this.iterations;
            case 'angle': return this.angle;
            case 'axiom': return this.axiom;
            case 'ruleF': return this.rules['F'];
           case 'ruleX': return this.rules['X'];
            default: return undefined;
       }
   }
    setParamValue(paramId, value) {
        switch (paramId) {
            case 'iterations': this.iterations = parseInt(value); this.reset(); break; // Reset on change
            case 'angle': this.angle = parseFloat(value); this.reset(); break;
           case 'axiom': this.axiom = value; this.reset(); break;
           case 'ruleF': this.rules['F'] = value; this.reset(); break;
            case 'ruleX': this.rules['X'] = value; this.reset(); break;
        }
   }
    onResize(newW, newH) { /* L-systems might redraw from center/bottom */
       this.width = newW; this.height = newH;
       this.initialLength = newH * 0.15; // Adjust start length relative to height
        this.reset();
   }

   // L-Systems typically don't "step" - they generate once
   step() { /* Does nothing by default, maybe animate drawing later? */ }
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
            // Ensure basic properties are set if not by constructor
            instance.id = systemId;
            instance.iteration = instance.iteration || 0;
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
