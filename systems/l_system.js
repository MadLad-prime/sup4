// --- systems/l_system.js ---
import { GenerativeSystem } from '../system_factory.js';

// Helper function from CA, maybe move to a utils file later
function degreesToRadians(degrees) { return degrees * (Math.PI / 180); }
function random(min, max) { return Math.random() * (max - min) + min; }

// Base L-System Logic (can be reused)
class LSystemBase extends GenerativeSystem {
    constructor(width, height) {
        super(width, height);
        this.name = "Base L-System";
        this.lines = [];
        // Default parameters - subclasses MUST override these
         this.params = {
            iterations: 4,
            angle: 25,
            axiom: 'F',
            rules: { 'F': 'F+F' },
            initialLengthFactor: 0.2, // % of height
             lengthFactor: 0.6,
            initialThickness: 5,
             thicknessFactor: 0.7,
            randomness: 0.1 // 0 to 1 factor for angle/length variation
         };
        this.currentString = '';
     }

    reset(){
        super.reset();
        this.lines = [];
        try {
            this.generateSystem();
             this.interpretSystem();
        } catch(e) {
            console.error("Error during L-system generation/interpretation:", e);
             // Optionally display error to user via lab interface?
        }
        console.log(`${this.name} reset/generated.`);
    }

    generateSystem(){
        this.currentString = this.params.axiom;
         let tempString = '';
        for (let i = 0; i < this.params.iterations; i++) {
            tempString = ''; // Reset temp string for next iteration
            for (const char of this.currentString) {
                tempString += this.params.rules[char] || char;
            }
             // Prevent extremely long strings which can freeze the browser
            if(tempString.length > 100000 && i < this.params.iterations -1) { // Check before last iteration
                console.warn(`L-System string length exceeded limit at iteration ${i+1}. Stopping early.`);
                 this.currentString = tempString; // Use the long string, but stop iterating
                 this.effectiveIterations = i + 1; // Store how many iterations actually completed
                 break; // Exit loop early
             }
            this.currentString = tempString;
             this.effectiveIterations = this.params.iterations;
         }
         console.log(`L-System string length: ${this.currentString.length}`);
     }

    // Interpretation needs to be implemented by subclasses based on desired structure
    interpretSystem(){
        console.warn("Base interpretSystem called - Subclass should implement turtle logic.");
        this.lines = []; // Ensure lines are cleared
    }

    getLines() { return this.lines; }
    getVisualizationHints() { return { renderMode: 'lines', lineWidthFactor: Math.max(0.2, 1.0 - (this.params.iterations / 10)*0.8) }; } // Thinner lines for more iterations
    getInteractionHint() { return 'Observing L-System'; }
     // Base parameter handling - subclasses can override or extend
    getParameters() { return [
        {id: 'iterations', label: 'Iterations', type: 'slider', min: 0, max: 8, step: 1, value:this.params.iterations, tooltip:'Recursion depth'},
        {id: 'angle', label: 'Angle (°)', type: 'slider', min: 0, max: 180, step: 1, value:this.params.angle, tooltip:'Base turning angle'},
        {id: 'axiom', label: 'Axiom', type: 'text', value: this.params.axiom},
         // Could use textarea for rules if they get complex
        ...Object.keys(this.params.rules).map(key => ({
             id: `rule_${key}`, label: `Rule (${key})`, type: 'text', value: this.params.rules[key]
         })),
        {id: 'randomness', label: 'Randomness', type: 'slider', min: 0, max: 1, step: 0.05, value: this.params.randomness, tooltip:'Angle/Length variation factor'}
    ]; }
    getParamValue(paramId){
        if (paramId.startsWith('rule_')) {
             const key = paramId.substring(5);
            return this.params.rules[key];
         }
        return this.params[paramId];
    }
    setParamValue(paramId, value){
        let needsReset = true; // Most param changes require regeneration
         if (paramId.startsWith('rule_')) {
            const key = paramId.substring(5);
            this.params.rules[key] = value;
         } else if (paramId === 'iterations') {
            this.params.iterations = Math.max(0, parseInt(value));
         } else if (paramId === 'angle') {
            this.params.angle = parseFloat(value);
        } else if (paramId === 'randomness'){
            this.params.randomness = parseFloat(value);
        } else if (paramId === 'axiom'){
             this.params.axiom = value;
         } else {
             needsReset = false; // Unknown param, don't reset
             console.warn(`Attempted to set unknown L-System param: ${paramId}`);
        }
         if (needsReset) this.reset();
    }

     onResize(newW, newH){
         this.width = newW; this.height = newH;
         this.reset(); // Recalculate lines based on new dimensions/start position
     }

     step(){ /* L-Systems typically generate statically */ }
} // End LSystemBase


// --- L-System Tree Implementation ---
export class LSystemTree extends LSystemBase {
    constructor(width, height) {
        super(width, height);
        this.name = "L-System Tree";
        // Override default params for Tree
         this.params = {
             iterations: 4,
             angle: 22.5, // Common branching angle
             axiom: 'X',
             // rules: { 'X': 'F+[[X]-X]-F[-FX]+X', 'F':'FF'}, // Complex Plant
            rules: {'X': 'F-[[X]+X]+F[+FX]-X', 'F':'FF'}, // Another common variant
            initialLengthFactor: 0.18, // Start slightly longer
            lengthFactor: 0.55, // Shrink more per level
            initialThickness: 8,
            thicknessFactor: 0.65,
             randomness: 0.15 // Add some randomness
         };
         this.reset(); // Generate initial tree
     }

    interpretSystem(){
         this.lines = []; // Clear previous lines
         const turtleStack = [];
         const initialLen = this.height * this.params.initialLengthFactor;
         let current = {
            x: this.width / 2, y: this.height, // Start at bottom center
            angle: -Math.PI / 2, // Point up
            len: initialLen / Math.pow(this.params.lengthFactor, -this.effectiveIterations*0.5 ), // Heuristic length scaling
             // length needs scaling based on actual iterations run
            // len: initialLen / Math.pow(1.6, this.effectiveIterations || this.params.iterations), // Scale length based on iterations run
            thickness: this.params.initialThickness
        };
         const angleRad = degreesToRadians(this.params.angle);
         const randFactor = this.params.randomness;

        for (const char of this.currentString) {
            let randAngle = (Math.random() - 0.5) * angleRad * randFactor;
            let randLenFactor = 1.0 + (Math.random() - 0.5) * randFactor * 0.5; // Less length randomness

            switch (char) {
                case 'F':
                    const nextX = current.x + Math.cos(current.angle) * current.len * randLenFactor;
                    const nextY = current.y + Math.sin(current.angle) * current.len * randLenFactor;
                    this.lines.push({
                        x1: current.x, y1: current.y, x2: nextX, y2: nextY,
                        thickness: Math.max(0.4, current.thickness),
                         // Determine leaf info based on being a terminal branch? Harder here.
                        leafInfo: { type: 'none' } // Basic default
                    });
                    current.x = nextX; current.y = nextY;
                    break;
                case '+': current.angle += angleRad + randAngle; break;
                case '-': current.angle -= angleRad + randAngle; break;
                case '[':
                     turtleStack.push({ ...current });
                    current.len *= this.params.lengthFactor;
                     current.thickness *= this.params.thicknessFactor;
                    break;
                 case ']':
                    // Maybe add leaf at branch end defined by ']' ?
                    if (this.lines.length > 0 && turtleStack.length > 0) { // Add leaf if we drew something before popping
                        const depth = turtleStack.length; // Estimate depth
                         const maxD = this.params.iterations;
                        this.lines[this.lines.length - 1].leafInfo = {
                            type: 'ellipse', // Willow-like
                             size: Math.max(1.5, current.thickness * 1.5 * (1+(maxD-depth)/maxD) ), // Larger leaves higher up?
                            color: `hsl(110, 60%, ${60+depth*3}%)` // Brighter green leaves
                         };
                     }
                    if(turtleStack.length > 0) current = turtleStack.pop();
                    break;
             }
        }
    } // End interpretSystem for Tree
} // End LSystemTree


// --- L-System Koch Snowflake Implementation ---
export class KochSnowflake extends LSystemBase {
    constructor(width, height){
        super(width, height);
        this.name = "L-System Koch Curve";
         // Override default params for Koch Snowflake
        this.params = {
            iterations: 4,
            angle: 60, // 60 degrees for Koch curve
            axiom: 'F++F++F', // Start with an equilateral triangle shape
            rules: { 'F': 'F-F++F-F' },
            // Adjust length/thickness factors as needed for visual appeal
            initialLengthFactor: 0.3, // Adjust size based on screen
            lengthFactor: 0.333, // Koch curve shrinks by 1/3 (theoretical) - use visually adjusted maybe
             initialThickness: 2,
             thicknessFactor: 1.0, // Koch usually has uniform thickness
            randomness: 0 // Koch curve is typically deterministic
        };
         this.startX = width * 0.2; // Adjust starting position/size for visibility
        this.startY = height * 0.7;
         this.initialAngle = 0; // Start horizontal? or degreesToRadians(30) for flat bottom?
         this.reset();
     }

     interpretSystem(){
         this.lines = []; // Clear previous lines
        const turtleStack = [];
         // Initial length calculation needs care - depends on screen space
        // Let's make initialLength relative to the available horizontal space mostly
        const usableWidth = this.width * 0.6;
         let currentLen = usableWidth;
        // For Koch, length decreases by 1/3 per iteration theoretically.
         // Total horizontal span will grow複雑に. Start with initial len that fits.
        // Rough estimation: Start shorter based on iterations
         currentLen = usableWidth / Math.pow(3, (this.effectiveIterations || this.params.iterations) * 0.8);


         let current = {
            x: this.startX, y: this.startY,
            angle: this.initialAngle,
             len: currentLen,
             thickness: this.params.initialThickness
        };
         const angleRad = degreesToRadians(this.params.angle);

         for (const char of this.currentString) {
            switch (char) {
                case 'F':
                    const nextX = current.x + Math.cos(current.angle) * current.len;
                    const nextY = current.y + Math.sin(current.angle) * current.len;
                     this.lines.push({ x1: current.x, y1: current.y, x2: nextX, y2: nextY, thickness: current.thickness, leafInfo: {type:'none'}});
                     current.x = nextX; current.y = nextY;
                    break;
                case '+': current.angle += angleRad; break;
                case '-': current.angle -= angleRad; break;
                // '[' and ']' not typically used in basic Koch snowflake axiom/rule
                case '[': turtleStack.push({ ...current }); break; // Support if rules use them
                 case ']': if(turtleStack.length > 0) current = turtleStack.pop(); break;
             }
        }
    } // End interpretSystem for Koch
     onResize(newW, newH){ /* Reset with adjusted start pos/length */
         this.width=newW; this.height=newH;
         this.startX = newW * 0.2;
        this.startY = newH * 0.7;
         this.reset();
    }

} // End KochSnowflake