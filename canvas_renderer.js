// --- Canvas Renderer Module ---
export default class CanvasRenderer {
    constructor(canvasElement) {
        if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) {
            throw new Error("CanvasRenderer requires a valid HTMLCanvasElement.");
        }
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d', { alpha: false }); // Improve perf by disabling alpha if not needed
        this.width = canvasElement.width;
        this.height = canvasElement.height;

        this.imageData = null; // For pixel manipulation if needed (Agents)
        this.imageBuffer = null; // Typed array view

        // Default visualization params
        this.params = {
            gridEnabled: true,
            palette: 'electric', // Default palette name
            backgroundColor: '#0a0c10', // Default matches body
            agentSize: 2,
            agentColor: 'rgba(255, 255, 180, 0.8)',
            trailFade: 0.02
        };

         // Define color palettes
         this.palettes = {
            electric: { bg: '#0a0c10', cellOn: '#00e0ff', cellOff: '#182030', grid: 'rgba(100, 150, 200, 0.1)', special: '#ff70a6' },
            forest: { bg: '#1a2a1a', cellOn: '#77cc77', cellOff: '#2a3a2a', grid: 'rgba(100, 150, 100, 0.1)', special: '#f0a050' },
            grayscale: { bg: '#111111', cellOn: '#e0e0e0', cellOff: '#333333', grid: 'rgba(128, 128, 128, 0.15)', special: '#ffffff'},
            neon_glow: { bg: '#000005', cellOn: '#ff00ff', cellOff: '#100510', grid: 'rgba(50, 0, 50, 0.2)', special: '#00ffff', useShadow: true},
            slime: { bg: '#080500', agent: 'rgba(255, 255, 180, 0.8)', trail: 'rgba(100, 180, 50, 1.0)', grid: 'rgba(60, 50, 40, 0.1)' }
            // Add more palettes
        };
         this.currentPalette = this.palettes[this.params.palette];


        console.log("CanvasRenderer initialized.");
    }

    setVisualizationParams(newParams) {
        this.params = { ...this.params, ...newParams }; // Merge new params
        if (newParams.palette && this.palettes[newParams.palette]) {
            this.currentPalette = this.palettes[newParams.palette];
        }
         this.params.backgroundColor = this.currentPalette.bg || '#0a0c10';
         console.log("Viz Params Updated:", this.params);
    }

    updateHints(hints = {}) {
        // Store hints for rendering (e.g., cell size for CAs)
        this.cellSize = hints.cellSize || 10;
         this.lineWidthFactor = hints.lineWidthFactor || 1.0; // For L-Systems etc.
         this.renderMode = hints.renderMode || 'grid'; // 'grid', 'lines', 'agents' etc.

         if (this.renderMode === 'agents' && (this.width !== this.canvas.width || !this.imageData)) {
            this.preparePixelBuffer();
        }
     }

    preparePixelBuffer() {
        if (this.width <= 0 || this.height <= 0) return;
        console.log("Preparing pixel buffer for agent rendering.");
        try {
            this.imageData = this.ctx.createImageData(this.width, this.height);
            this.imageBuffer = new Uint32Array(this.imageData.data.buffer);
        } catch (e) {
            console.error("Error creating ImageData:", e);
            this.imageData = null;
            this.imageBuffer = null;
        }
    }

    onResize() {
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.ctx.lineCap = 'round'; // Reset context properties if needed
        this.ctx.font = '10px Roboto Mono'; // Example default
         console.log("Renderer dimensions updated.");

         if (this.renderMode === 'agents') {
            this.preparePixelBuffer();
        } else {
            this.imageData = null;
            this.imageBuffer = null;
        }
     }

     // Main render function - decides which specific render method to call
    render(system) {
         if (!system || !this.ctx) return;

         if (this.renderMode === 'agents') {
            this.fadeTrails();
        } else {
            this.ctx.fillStyle = this.currentPalette.bg || '#0a0c10';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        // Call system-specific render method
         switch (this.renderMode) {
             case 'grid':
                 this.renderGridSystem(system);
                 break;
            case 'lines':
                 this.renderLineSystem(system);
                break;
            case 'agents':
                this.renderAgentSystem(system);
                break;
            // Add cases for other render modes (agents, particles, etc.)
            default:
                console.warn("Unknown renderMode:", this.renderMode);
        }

        if (this.params.gridEnabled && this.renderMode === 'grid') {
            this.drawGrid();
        }
    }

    // Specific render method for grid-based systems (like Cellular Automata)
    renderGridSystem(system) {
        const grid = system.getGrid ? system.getGrid() : null;
        const cols = system.cols || 0;
        const rows = system.rows || 0;
        if (!grid || cols === 0 || rows === 0 || !this.cellSize) return;

        const onColor = this.currentPalette.cellOn || '#ffffff';
        const offColor = this.currentPalette.cellOff || '#000000';
         const specialColors = {}; // For multi-state CAs
         if (typeof system.getSpecialColors === 'function') {
            Object.assign(specialColors, system.getSpecialColors(this.currentPalette));
         }


         // Shadow effects (optional, performance cost)
        if (this.currentPalette.useShadow) {
             this.ctx.shadowBlur = 8;
             this.ctx.shadowColor = onColor;
         } else {
             this.ctx.shadowBlur = 0;
         }

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const cellState = grid[y][x];
                 let fillColor = offColor; // Default to off

                 if (cellState === 1) { // Common 'ON' state
                     fillColor = onColor;
                } else if (cellState > 1 && specialColors[cellState]) { // Check for special states
                    fillColor = specialColors[cellState];
                } else if (cellState !== 0){
                     // Fallback for unknown non-zero states (can indicate error or needs specific palette handling)
                    // Maybe lerp color based on state value?
                     // fillColor = `hsl(240, 50%, ${Math.min(100, cellState * 10)}%)`; // Example fallback
                     fillColor = this.currentPalette.special || '#ff0000'; // Use special or bright red
                 }


                 // Only draw if not the background color (performance opt.)
                 if(fillColor !== offColor) {
                    this.ctx.fillStyle = fillColor;
                    this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }

         this.ctx.shadowBlur = 0; // Reset shadow
    }

     // Specific render method for line-based systems (like L-Systems)
     renderLineSystem(system) {
         const lines = system.getLines ? system.getLines() : null;
         if (!lines || lines.length === 0) return;

        const palette = this.currentPalette;
         this.ctx.lineCap = 'round';

         lines.forEach(line => {
            // Example: Use different color based on line properties (e.g., depth?)
             let strokeColor = palette.cellOn || '#ffffff'; // Default 'on' color
            // Optional: Change color based on line.depth or other factors
             // strokeColor = `hsl(${100 + line.depth * 15}, 60%, 70%)`;

            this.ctx.lineWidth = Math.max(0.5, (line.thickness || 1) * this.lineWidthFactor);
             this.ctx.strokeStyle = strokeColor;

             this.ctx.beginPath();
             this.ctx.moveTo(line.x1, line.y1);
             this.ctx.lineTo(line.x2, line.y2);
             this.ctx.stroke();

            // Draw optional 'leaves' if data provided by system
             if(line.leafInfo && line.leafInfo.type !== 'none') {
                 this.drawLeaf(line.x2, line.y2, line.leafInfo, palette);
             }
        });
    }

    renderAgentSystem(system) {
        if (!this.imageData || !this.imageBuffer) {
            console.warn("Pixel buffer not ready for agent rendering.");
            this.preparePixelBuffer();
            if (!this.imageData) return;
        }
        const agents = system.getAgents ? system.getAgents() : null;
        if (!agents) return;

        const agentColor = this.currentPalette.agent || this.params.agentColor;
        this.ctx.fillStyle = agentColor;
        const agentSize = this.params.agentSize;
        agents.forEach(agent => {
            this.ctx.fillRect(Math.floor(agent.x - agentSize / 2), Math.floor(agent.y - agentSize / 2), agentSize, agentSize);
        });

        this.ctx.putImageData(this.imageData, 0, 0);
    }

    drawLeaf(x, y, leafInfo, palette) {
         this.ctx.fillStyle = leafInfo.color || palette.special || '#ff70a6';
        let size = leafInfo.size || 3;
         this.ctx.beginPath();
         switch(leafInfo.type) {
            case 'circle':
                 ctx.arc(x, y, size, 0, Math.PI * 2);
                 break;
            // Add other leaf shapes
             default: // Default to circle
                 ctx.arc(x, y, size, 0, Math.PI * 2);
                 break;
         }
        ctx.fill();
    }

    updateAgentTrails(agentData) {
        if (!this.imageData || !this.imageBuffer) return;

        const w = this.width;
        const h = this.height;

        agentData.forEach(d => {
            const x = Math.floor(d.x);
            const y = Math.floor(d.y);
            if (x >= 0 && x < w && y >= 0 && y < h) {
                const index = (y * w + x);
                const pixelIndexOffset = index * 4;
                const data = this.imageData.data;
                data[pixelIndexOffset + 1] = Math.min(255, data[pixelIndexOffset + 1] + d.deposition * 150);
                data[pixelIndexOffset + 3] = Math.max(data[pixelIndexOffset + 3], 150);
            }
        });
    }

    fadeTrails() {
        if (!this.imageData || !this.imageBuffer) return;
        const data = this.imageData.data;
        const decayAmount = 2;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 1] > 0) {
                data[i + 1] = Math.max(0, data[i + 1] - decayAmount);
            }
            if (data[i + 1] === 0 && data[i + 3] > 0) {
                data[i + 3] = Math.max(0, data[i + 3] - decayAmount * 2);
            }
        }
    }

    // Draw grid lines (if enabled)
    drawGrid() {
         if (!this.cellSize || this.cellSize < 3) return; // Don't draw grid if cells too small

        this.ctx.strokeStyle = this.currentPalette.grid || 'rgba(128, 128, 128, 0.1)';
        this.ctx.lineWidth = 0.5;

         for (let x = 0; x <= this.width; x += this.cellSize) {
             this.ctx.beginPath();
             this.ctx.moveTo(x + 0.5, 0); // Offset by 0.5 for crisp lines
             this.ctx.lineTo(x + 0.5, this.height);
             this.ctx.stroke();
         }
         for (let y = 0; y <= this.height; y += this.cellSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y + 0.5);
            this.ctx.lineTo(this.width, y + 0.5);
            this.ctx.stroke();
         }
    }

    clear() {
        this.ctx.fillStyle = this.params.backgroundColor;
        this.ctx.fillRect(0, 0, this.width, this.height);
        if (this.imageBuffer) {
            this.imageBuffer.fill(0);
            this.ctx.putImageData(this.imageData, 0, 0);
        }
    }
}