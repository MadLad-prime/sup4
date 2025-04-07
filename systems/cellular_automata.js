// --- systems/cellular_automata.js ---
import { GenerativeSystem } from '../base_system.js'; // Ensure this is the only import

// Helper function for creating grids
function createGrid(rows, cols, initialValue = 0) {
    return Array.from({ length: rows }, () => Array(cols).fill(initialValue));
}

// --- Conway's Game of Life Implementation ---
export class ConwayLife extends GenerativeSystem {
    constructor(width, height) {
        super(width, height);
        this.name = "Conway's Game of Life";
         this.params = { // Expose parameters if any (like initial density)
             cellSize: 10,
             initialDensity: 0.25
         };
        this.cellSize = this.params.cellSize;
        this.calculateGridDimensions();
        this.grid = createGrid(this.rows, this.cols);
        this.nextGrid = createGrid(this.rows, this.cols);
        this.population = 0;
    }

    calculateGridDimensions() {
        this.cols = Math.max(1, Math.floor(this.width / this.cellSize));
        this.rows = Math.max(1, Math.floor(this.height / this.cellSize));
     }

     createGrid() { return createGrid(this.rows, this.cols); }

    reset(randomize = true) {
        super.reset();
        this.grid = this.createGrid();
        this.nextGrid = this.createGrid();
         if(randomize) this.randomize(this.params.initialDensity);
        this.population = this.calculatePopulation();
        console.log("ConwayLife reset.");
    }

    randomize(density) {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                this.grid[y][x] = (Math.random() < density) ? 1 : 0;
            }
        }
        this.params.initialDensity = density; // Update param if randomized externally
    }

    step() {
        this.population = 0;
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const state = this.grid[y][x];
                const neighbors = this.countNeighbors(x, y);
                let nextState = state;
                if (state === 1 && (neighbors < 2 || neighbors > 3)) nextState = 0;
                else if (state === 0 && neighbors === 3) nextState = 1;
                this.nextGrid[y][x] = nextState;
                if (nextState === 1) this.population++;
            }
        }
        [this.grid, this.nextGrid] = [this.nextGrid, this.grid]; // Swap buffers
        this.iteration++;
    }

    countNeighbors(x, y) {
         let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = (x + dx + this.cols) % this.cols;
                const ny = (y + dy + this.rows) % this.rows;
                count += this.grid[ny][nx];
            }
        }
        return count;
    }

     // --- Methods for Lab Interface ---
     getGrid() { return this.grid; }
    getPopulation() { return this.population; }
     getVisualizationHints() { return { renderMode: 'grid', cellSize: this.cellSize }; }
    getInteractionHint() { return 'Click/Drag to toggle cells (while paused)'; }
    handleMouseDown(x, y) { this.toggleCell(x, y); this.population = this.calculatePopulation(); } // Recalc pop on manual change
    handleMouseMove(x, y) { this.toggleCell(x, y); this.population = this.calculatePopulation(); }

    toggleCell(canvasX, canvasY) {
        const gridX = Math.floor(canvasX / this.cellSize);
        const gridY = Math.floor(canvasY / this.cellSize);
        if (gridY >= 0 && gridY < this.rows && gridX >= 0 && gridX < this.cols) {
             // Don't toggle if running, maybe? Or allow it. Current allows toggle anytime.
            this.grid[gridY][gridX] = 1 - this.grid[gridY][gridX];
        }
    }
     calculatePopulation(){ return this.grid.flat().reduce((sum, cell) => sum + cell, 0);}
     onResize(w, h) { /* ... implement grid resize logic similar to previous example ... */
         this.width=w; this.height=h;
         this.calculateGridDimensions();
         // Basic resize - could preserve pattern better with different strategies
         const oldGrid = this.grid;
         this.grid = this.createGrid();
         this.nextGrid = this.createGrid();
         const copyRows = Math.min(oldGrid.length, this.rows);
         const copyCols = Math.min(oldGrid[0]?.length || 0, this.cols);
         for(let y=0; y < copyRows; y++) {
            for(let x=0; x < copyCols; x++) {
                 this.grid[y][x] = oldGrid[y][x];
            }
         }
         this.population = this.calculatePopulation();
    }
    // Define actual parameters users can control
     getParameters() { return [
        {id: 'cellSize', label: 'Cell Size (px)', type: 'slider', min: 2, max: 20, step: 1, value: this.params.cellSize, tooltip:'Size of each cell, requires reset'},
         {id: 'initialDensity', label: 'Initial Density', type: 'slider', min: 0.01, max: 0.8, step: 0.01, value: this.params.initialDensity, tooltip:'Density for Randomize button'},
         {id: 'randomizeBtn', label: '', type: 'button', buttonText:'Randomize Grid', tooltip:'Fill grid randomly based on density'}
     ]; }
     getParamValue(paramId) { return this.params[paramId]; }
     setParamValue(paramId, value) {
         if(paramId === 'cellSize'){
            this.params.cellSize = Math.max(1, parseInt(value)); // Prevent 0 size
            this.cellSize = this.params.cellSize;
             this.onResize(this.width, this.height); // Recalculate grid on cell size change
             this.reset(false); // Reset grid (don't randomize automatically)
             console.log("Cell size changed, grid reset.");
         } else if (paramId === 'initialDensity') {
            this.params.initialDensity = parseFloat(value);
         }
     }
    // Handle custom button action
     triggerAction(actionId){
         if(actionId === 'randomizeBtn'){
            this.reset(true); // Randomize
        }
    }
}


// --- Brian's Brain CA Implementation ---
export class BrianBrain extends ConwayLife { // Inherit grid logic from Life
    constructor(width, height) {
        super(width, height); // Call ConwayLife constructor
        this.name = "Brian's Brain CA";
         // No specific adjustable params beyond cell size/density needed for basic Brian's Brain
         // But we keep the structure from parent
         this.params.initialDensity = 0.35; // Often looks good with higher density
         this.cellSize = this.params.cellSize || 5; // Smaller cells often work well
         this.calculateGridDimensions(); // Recalculate based on potentially new cellSize
         this.reset(); // Call parent reset with new density
    }

     // Brian's Brain States: 0 = OFF, 1 = FIRING, 2 = REFRACTORY

    reset(randomize = true) {
        super.reset(randomize); // Use parent reset (which uses current initialDensity)
        console.log("Brian's Brain reset.");
     }

    step() {
         this.population = 0; // Count firing cells
         for (let y = 0; y < this.rows; y++) {
             for (let x = 0; x < this.cols; x++) {
                 const state = this.grid[y][x];
                 let nextState = state;

                if (state === 1) { // FIRING cells -> become REFRACTORY
                     nextState = 2;
                } else if (state === 2) { // REFRACTORY cells -> become OFF
                     nextState = 0;
                 } else if (state === 0) { // OFF cells -> FIRE if exactly 2 neighbors are FIRING
                     const neighbors = this.countNeighbors(x, y); // Counts only FIRING (state 1) neighbors
                     if (neighbors === 2) {
                         nextState = 1;
                    }
                 }

                 this.nextGrid[y][x] = nextState;
                if(nextState === 1) this.population++; // Only count firing state
             }
         }
        [this.grid, this.nextGrid] = [this.nextGrid, this.grid];
         this.iteration++;
     }

     // Override neighbor count to ONLY count firing (state 1) neighbors
     countNeighbors(x, y) {
        let count = 0;
         for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = (x + dx + this.cols) % this.cols;
                const ny = (y + dy + this.rows) % this.rows;
                 // Check if neighbor state is FIRING (1)
                 if (this.grid[ny][nx] === 1) {
                    count++;
                }
             }
         }
        return count;
     }

    // Provide specific colors for the renderer
    getSpecialColors(palette){
         return {
             1: palette.special2 || '#ffff00', // Firing state (use special2 - yellow default)
             2: palette.special1 || '#ff70a6'  // Refractory state (use special1 - pink default)
         }
     }
     // Brian's Brain doesn't really use density parameter after init, hide maybe?
     // Or reuse parent parameters structure and ignore density input
    // Or create distinct parameters:
     getParameters() { return [
         {id: 'cellSize', label: 'Cell Size (px)', type: 'slider', min: 2, max: 15, step: 1, value: this.params.cellSize, tooltip:'Size of each cell, requires reset'},
         {id: 'randomizeBtn', label: '', type: 'button', buttonText:'Randomize Grid', tooltip:'Fill grid randomly'}
     ]; }
     getParamValue(paramId) { return this.params[paramId]; }
     setParamValue(paramId, value){ // Only handle cellSize for Brian
        if(paramId === 'cellSize'){
            this.params.cellSize = Math.max(1, parseInt(value));
            this.cellSize = this.params.cellSize;
             this.onResize(this.width, this.height);
             this.reset(false); // Reset, don't randomize automatically
        }
     }
    triggerAction(actionId){ // Handle randomize button
        if(actionId === 'randomizeBtn'){
            this.reset(true); // Call parent randomize
         }
    }

    // Override interaction to cycle through states: 0 -> 1 -> 2 -> 0
     toggleCell(canvasX, canvasY){
         const gridX = Math.floor(canvasX / this.cellSize);
        const gridY = Math.floor(canvasY / this.cellSize);
         if(gridY >= 0 && gridY < this.rows && gridX >=0 && gridX < this.cols){
             let currentState = this.grid[gridY][gridX];
             this.grid[gridY][gridX] = (currentState + 1) % 3; // Cycle 0, 1, 2
            this.population = this.calculatePopulation(); // Recalculate firing population
         }
     }
     calculatePopulation(){ // Count only firing (state 1)
        return this.grid.flat().reduce((sum, cell) => sum + (cell === 1 ? 1 : 0), 0);
    }

} // End BrianBrain Class
