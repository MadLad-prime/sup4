// --- System Factory Module ---
// Dynamically imports and creates instances of different systems
// NOTE: Dynamic import() usually works better with bundlers or specific server setups.
// For simple file:// loading, you might need to concatenate files or use classic <script> includes.
// Let's *try* dynamic import, but provide fallback structure if needed.

// We'll define placeholder classes directly here for simplicity in this example.
// In a real build, these would be in separate files like `systems/cellular_automata.js`.

// --- Base System Class (Optional but good practice) ---
class GenerativeSystem {
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
    getPopulation() { return '-'; /* Subclass implements if applicable */}
   getVisualizationHints() { return {}; /* Subclass provides render mode, cell size etc. */}
   getInteractionHint() { return 'Observing'; /* Subclass provides interaction details */ }
   // Interaction handlers - optional, implement if system needs them
   handleMouseDown(x, y, button) {}
    handleMouseMove(x, y) {}
   handleMouseUp(x, y) {}
    onResize(newWidth, newHeight){ this.width = newWidth; this.height = newHeight; /* May need grid resize etc */ }
    destroy() { /* Optional cleanup */ }
}

// --- Placeholder Conway's Life System ---
class ConwayLife extends GenerativeSystem {
   constructor(width, height) {
       super(width, height);
       this.name = "Conway's Game of Life";
       this.cellSize = 10;
        this.calculateGridDimensions();
       this.grid = this.createGrid();
       this.nextGrid = this.createGrid(); // Buffer for next state
       this.population = 0;
   }

   calculateGridDimensions(){
       this.cols = Math.floor(this.width / this.cellSize);
       this.rows = Math.floor(this.height / this.cellSize);
   }

   createGrid() { return Array.from({ length: this.rows }, () => Array(this.cols).fill(0)); }

   reset() {
        super.reset();
       this.grid = this.createGrid();
       this.nextGrid = this.createGrid();
       // Random initial state (e.g., 20% alive)
       this.randomize(0.2);
       this.population = this.calculatePopulation();
    }

   randomize(density = 0.2){
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                this.grid[y][x] = (Math.random() < density) ? 1 : 0;
           }
       }
    }

   step() {
       this.population = 0; // Reset count for the new generation
       for (let y = 0; y < this.rows; y++) {
           for (let x = 0; x < this.cols; x++) {
               const state = this.grid[y][x];
               const neighbors = this.countNeighbors(x, y);
               let nextState = state;

               if (state === 1 && (neighbors < 2 || neighbors > 3)) {
                   nextState = 0; // Death by isolation or overcrowding
               } else if (state === 0 && neighbors === 3) {
                   nextState = 1; // Birth
                } // Else: Survival (state === 1 and neighbors === 2 or 3)

               this.nextGrid[y][x] = nextState;
               if(nextState === 1) this.population++;
            }
       }
       // Swap grids
        [this.grid, this.nextGrid] = [this.nextGrid, this.grid]; // Efficient swap
        this.iteration++;
   }

   countNeighbors(x, y) {
       let count = 0;
       for (let dy = -1; dy <= 1; dy++) {
           for (let dx = -1; dx <= 1; dx++) {
               if (dx === 0 && dy === 0) continue; // Skip self
               const nx = (x + dx + this.cols) % this.cols; // Wrap edges
               const ny = (y + dy + this.rows) % this.rows; // Wrap edges
               count += this.grid[ny][nx];
           }
       }
       return count;
    }

   getGrid() { return this.grid; }
   getPopulation() { return this.population; }
   getVisualizationHints() { return { renderMode: 'grid', cellSize: this.cellSize }; }
   getInteractionHint() { return 'Click/Drag to toggle cells (while paused)'; }

    handleMouseDown(x, y) { this.toggleCell(x,y); }
    handleMouseMove(x, y) { this.toggleCell(x,y); } // Draw continuously while dragging

   toggleCell(canvasX, canvasY){
        const gridX = Math.floor(canvasX / this.cellSize);
       const gridY = Math.floor(canvasY / this.cellSize);
        if(gridY >= 0 && gridY < this.rows && gridX >=0 && gridX < this.cols){
           this.grid[gridY][gridX] = 1 - this.grid[gridY][gridX]; // Toggle 0/1
           this.population = this.calculatePopulation(); // Recalculate pop
        }
    }
    calculatePopulation(){ return this.grid.flat().reduce((sum, cell) => sum + cell, 0);}

    onResize(newWidth, newHeight){
        // Basic resize: Keep existing grid content in top-left, recalculate dims
       this.width = newWidth; this.height = newHeight;
        const oldRows = this.rows; const oldCols = this.cols;
        this.calculateGridDimensions();
        const newGrid = this.createGrid();
        const newNextGrid = this.createGrid();
        // Copy old grid content if needed
        for(let y=0; y < Math.min(oldRows, this.rows); y++){
            for(let x=0; x < Math.min(oldCols, this.cols); x++){
                newGrid[y][x] = this.grid[y][x];
           }
       }
        this.grid = newGrid; this.nextGrid = newNextGrid;
        this.population = this.calculatePopulation();
    }
    getParameters() { return [ // Example parameter (maybe not needed for simple life)
         // {id: 'density', label: 'Initial Density', type: 'slider', min: 0.05, max: 0.8, step: 0.05, tooltip:'Density for Randomize'}
    ]; }
    getParamValue(paramId){ return undefined;} // No persistent params for basic Life
    setParamValue(paramId, value){ /* handle density on randomize maybe */}
}


// --- Placeholder L-System ---
// Note: Full L-system parsing and turtle graphics is quite complex
// This will be a simplified version generating direct line segments
class LSystemTree extends GenerativeSystem {
   constructor(width, height){
       super(width, height);
        this.name = "L-System Tree";
        this.lines = [];
        // --- L-System Parameters ---
        this.axiom = 'X';
        this.rules = { 'X': 'F+[[X]-X]-F[-FX]+X', 'F':'FF'}; // A common fractal plant rule
        this.angle = 25; // Degrees
        this.iterations = 4; // Start with fewer iterations
        this.currentString = '';
        this.initialLength = height * 0.15;
        this.lengthFactor = 0.6;
        this.initialThickness = 6;
    }

   reset(){
       super.reset();
       this.lines = [];
       this.generateSystem();
       this.interpretSystem();
    }

    // Generate the L-system string
    generateSystem(){
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
    interpretSystem(){
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
                    this.lines.push({ x1: current.x, y1: current.y, x2: nextX, y2: nextY, thickness: Math.max(0.5, current.thickness), leafInfo:{type:'none'}}); // Add leaf info later maybe
                   current.x = nextX;
                   current.y = nextY;
                   break;
               case '+': // Turn right
                   current.angle += angleRad * (Math.random()*0.4+0.8); // Add variation
                   break;
               case '-': // Turn left
                   current.angle -= angleRad * (Math.random()*0.4+0.8); // Add variation
                    break;
               case '[': // Push state
                   turtleStack.push({ ...current });
                   // Optionally modify pushed state slightly (e.g., reduce length/thickness faster)
                   current.len *= this.lengthFactor * (Math.random()*0.2+0.9);
                    current.thickness *= 0.75;
                   break;
                case ']': // Pop state
                    if(turtleStack.length > 0) {
                       // Maybe add a 'leaf' here on pop if desired
                       if(this.lines.length > 0) this.lines[this.lines.length - 1].leafInfo = {type: 'circle', size: Math.max(1, current.thickness * 1.2), color:'hsl(110, 70%, 80%)' };
                        current = turtleStack.pop();
                    }
                   break;
               // Ignore other characters like X
           }
       }
        console.log(`Generated ${this.lines.length} line segments for L-System.`);
    }

    getLines() { return this.lines; }
   getVisualizationHints() { return { renderMode: 'lines', lineWidthFactor: 0.5 + (this.iterations/8)*0.8 }; } // Scale line width based on iterations
   getInteractionHint() { return 'Observing L-System Growth'; }

    getParameters() { return [
       {id: 'iterations', label: 'Iterations', type: 'slider', min: 1, max: 7, step: 1, value:this.iterations, tooltip:'Number of recursive steps'},
        {id: 'angle', label: 'Angle (°)', type: 'slider', min: 5, max: 60, step: 1, value:this.angle, tooltip:'Base branching angle'},
       {id: 'axiom', label: 'Axiom', type: 'text', value: this.axiom, tooltip:'Starting symbol string'},
       {id: 'ruleF', label: 'Rule (F)', type: 'text', value: this.rules['F'], tooltip:'Replacement rule for F'},
       {id: 'ruleX', label: 'Rule (X)', type: 'text', value: this.rules['X'], tooltip:'Replacement rule for X'}
       // Could add length factor etc.
    ]; }
    getParamValue(paramId){
       switch(paramId){
           case 'iterations': return this.iterations;
            case 'angle': return this.angle;
            case 'axiom': return this.axiom;
            case 'ruleF': return this.rules['F'];
           case 'ruleX': return this.rules['X'];
            default: return undefined;
       }
   }
    setParamValue(paramId, value){
        switch(paramId){
            case 'iterations': this.iterations = parseInt(value); this.reset(); break; // Reset on change
            case 'angle': this.angle = parseFloat(value); this.reset(); break;
           case 'axiom': this.axiom = value; this.reset(); break;
           case 'ruleF': this.rules['F'] = value; this.reset(); break;
            case 'ruleX': this.rules['X'] = value; this.reset(); break;
        }
   }
    onResize(newW, newH){ /* L-systems might redraw from center/bottom */
       this.width=newW; this.height=newH;
       this.initialLength = newH * 0.15; // Adjust start length relative to height
        this.reset();
   }

   // L-Systems typically don't "step" - they generate once
   step(){ /* Does nothing by default, maybe animate drawing later? */ }
}


// --- Mapping from System ID to Class ---
// We define this explicitly instead of dynamic import for simple file:// loading
const systemRegistry = {
   'ca_life': ConwayLife,
    'l_system_tree': LSystemTree,
   'ca_brain': null, // Placeholder - Brian's Brain CA Class would go here
    'l_system_koch': null, // Placeholder - Koch Curve L-System Class here
};


// --- Factory Function ---
export function createSystemInstance(systemId, width, height) {
    const SystemClass = systemRegistry[systemId];
    if (SystemClass) {
        try {
           return new SystemClass(width, height);
        } catch (e) {
           console.error(`Error constructing system ${systemId}:`, e);
           return null;
       }
    } else {
        console.warn(`System ID "${systemId}" not found in registry.`);
        // Maybe return a default/dummy system?
        return new GenerativeSystem(width, height); // Return base class instance
    }
}