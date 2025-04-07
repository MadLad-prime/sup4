// --- systems/agent_system.js ---
import { GenerativeSystem } from '../system_factory.js';

function random(min, max) { return Math.random() * (max - min) + min; }

// --- Agent Class ---
class Agent {
    constructor(x, y, angle, settings) {
        this.x = x;
        this.y = y;
        this.angle = angle; // Radians
         this.settings = settings; // Reference to system settings
    }

     // Basic move forward step
     move(deltaTime = 1) { // deltaTime could scale movement, keep 1 for simple step
        this.x += Math.cos(this.angle) * this.settings.moveSpeed * deltaTime;
         this.y += Math.sin(this.angle) * this.settings.moveSpeed * deltaTime;
     }

     // Keep agent within bounds (wrapping strategy)
    wrapBounds(width, height) {
        if (this.x < 0) this.x += width;
        if (this.x >= width) this.x -= width;
        if (this.y < 0) this.y += height;
        if (this.y >= height) this.y -= height;
     }

    // --- Sensing and Steering (Physarum Simulation Logic) ---
    // This is the core "intelligent" part
    senseAndSteer(trailMap, width, height) {
        // Sample trail intensity at sensor points ahead and to the sides
         const sensorDist = this.settings.sensorDistance;
         const sensorAngle = this.settings.sensorAngle; // Radians

        // 1. Center sensor (directly ahead)
         const fX = (this.x + Math.cos(this.angle) * sensorDist + width) % width;
         const fY = (this.y + Math.sin(this.angle) * sensorDist + height) % height;
        const weightForward = this.sampleTrail(trailMap, width, fX, fY);

        // 2. Left sensor
        const angleL = this.angle - sensorAngle;
        const lX = (this.x + Math.cos(angleL) * sensorDist + width) % width;
        const lY = (this.y + Math.sin(angleL) * sensorDist + height) % height;
        const weightLeft = this.sampleTrail(trailMap, width, lX, lY);

        // 3. Right sensor
        const angleR = this.angle + sensorAngle;
        const rX = (this.x + Math.cos(angleR) * sensorDist + width) % width;
        const rY = (this.y + Math.sin(angleR) * sensorDist + height) % height;
        const weightRight = this.sampleTrail(trailMap, width, rX, rY);

        // Steering logic based on sensor weights
        const turnSpeed = this.settings.turnSpeed; // Radians

        if (weightForward > weightLeft && weightForward > weightRight) {
             // Keep going mostly straight (maybe slight random turn)
             this.angle += random(-1, 1) * this.settings.randomSteerStrength;
         } else if (weightRight > weightLeft) {
             this.angle += turnSpeed * (1 + random(-1, 1) * this.settings.randomSteerStrength*0.5); // Turn right preferentially
         } else if (weightLeft > weightRight) {
            this.angle -= turnSpeed * (1 + random(-1, 1) * this.settings.randomSteerStrength*0.5); // Turn left preferentially
        } else {
             // If left/right are equal but stronger than forward, pick randomly
            if(weightLeft > weightForward && weightRight > weightForward){
                this.angle += (Math.random() > 0.5 ? 1 : -1) * turnSpeed * (1 + random(-1, 1) * this.settings.randomSteerStrength*0.5);
            } else {
                // Fallback: Continue mostly straight with random turn
                 this.angle += random(-1, 1) * this.settings.randomSteerStrength;
            }
        }
         // Clamp angle just in case? Or let it wrap naturally with cos/sin.
    }


     // Sample the trail map at a given coordinate
     // Use bilinear interpolation or just nearest neighbor for simplicity/performance
     sampleTrail(trailMap, mapWidth, x, y) {
        const gridX = Math.floor(x);
        const gridY = Math.floor(y);
         if (gridX < 0 || gridX >= mapWidth || gridY < 0 || gridY >= trailMap.length / mapWidth) {
             return 0; // Out of bounds
         }
         // Just sample the green channel for now (where we store pheromone)
         return trailMap[(gridY * mapWidth + gridX) * 4 + 1]; // G value at the pixel
         // Bilinear interpolation would sample 4 neighbours and weigh them.
     }
} // End Agent Class

// --- Slime Mold Agent System ---
export class SlimeMold extends GenerativeSystem {
    constructor(width, height) {
        super(width, height);
        this.name = "Agent System (Slime Mold)";
        this.agents = [];
        this.trailMapData = null; // Uint8ClampedArray reference from renderer buffer
         this.needsBufferUpdate = true; // Flag to tell renderer to update buffer

         this.params = {
            agentCount: 5000, // HIGH number for slime effect
            moveSpeed: 1.2,
            turnSpeed: degreesToRadians(25),
            sensorAngle: degreesToRadians(30),
            sensorDistance: 9,
            depositionAmount: 4, // How much trail is left per step
            decayFactor: 0.98, // Multiplicative decay per step (1 = no decay) ~ Use renderer fade!
            randomSteerStrength: 0.1 // How much randomness in steering
            // Renderer params (can be here or controlled separately)
            // agentSize: 1.5,
            // trailFade: 0.015
         };

         this.reset();
    }

    reset() {
         super.reset();
         this.agents = [];
         // Initial agent placement (e.g., circle in center)
         const centerX = this.width / 2;
         const centerY = this.height / 2;
         const spawnRadius = Math.min(this.width, this.height) * 0.05; // Small spawn radius

        for (let i = 0; i < this.params.agentCount; i++) {
             // Start in a ring or cluster? Start agents facing outwards
            const angle = random(0, Math.PI * 2);
             const radius = Math.sqrt(Math.random()) * spawnRadius; // Uniform distribution in circle
            const startX = centerX + Math.cos(angle) * radius;
            const startY = centerY + Math.sin(angle) * radius;
            this.agents.push(new Agent(startX, startY, angle, this.params));
            // OR start randomly:
            // this.agents.push(new Agent(random(0,this.width), random(0,this.height), random(0, Math.PI * 2), this.params));
        }
         this.needsBufferUpdate = true; // Signal renderer to clear/update buffer
        console.log(`SlimeMold reset with ${this.agents.length} agents.`);
     }

    step(renderer) { // Needs access to the renderer for the trail map
         if (!renderer || !renderer.imageData || !renderer.imageData.data) {
            if(this.iteration < 10) console.warn("Agent step skipped: Renderer buffer not ready.");
            this.iteration++;
            return; // Skip if renderer buffer isn't available
        }
        // If buffer needed updating (e.g. after reset), do it once
         if(this.needsBufferUpdate) {
             renderer.clear(); // Clear should clear the pixel buffer too
             this.needsBufferUpdate = false;
         }

         this.trailMapData = renderer.imageData.data; // Get reference to raw pixel data

         const agentDepositions = []; // Collect positions where agents deposit trail

         // 1. Agent Movement & Sensing
         this.agents.forEach(agent => {
             agent.senseAndSteer(this.trailMapData, this.width, this.height);
             agent.move();
             agent.wrapBounds(this.width, this.height);
             // Record where this agent will deposit trail
             agentDepositions.push({ x: agent.x, y: agent.y, deposition: this.params.depositionAmount });
         });

         // 2. Update Trail Map (Deposition) - Delegate this to Renderer
        if(renderer && typeof renderer.updateAgentTrails === 'function') {
            renderer.updateAgentTrails(agentDepositions);
         }
        // 3. Diffusion & Decay is handled by renderer's `fadeTrails` called during render loop

         this.iteration++;
     }


     // --- Methods for Lab Interface ---
     getAgents() { return this.agents; }
     // Population doesn't really apply here in the same way, return agent count?
     getPopulation() { return this.agents.length; }
    getVisualizationHints() { return { renderMode: 'agents' }; }
    getInteractionHint() { return 'Observing Agent Movement'; }
     // No specific interaction for this basic version
     handleMouseDown(x,y){ /* Maybe add agent spawn on click later? */ }

    onResize(w, h){
         this.width=w; this.height=h;
        // Could try to reposition agents smartly, but reset is simpler
        this.reset();
     }
     getParameters() { return [
         {id: 'agentCount', label: 'Agent Count', type: 'slider', min: 100, max: 15000, step: 100, value: this.params.agentCount, tooltip:'Number of agents (Performance heavy!)'},
         {id: 'moveSpeed', label: 'Move Speed', type: 'slider', min: 0.1, max: 3, step: 0.1, value: this.params.moveSpeed, tooltip:'Agent pixels per step'},
         {id: 'turnSpeed', label: 'Turn Speed (°)', type: 'slider', min: 1, max: 90, step: 1, value: (this.params.turnSpeed * 180 / Math.PI), tooltip:'Max turn angle per step'}, // Convert to degrees for UI
         {id: 'sensorAngle', label: 'Sensor Angle (°)', type: 'slider', min: 5, max: 90, step: 1, value:(this.params.sensorAngle * 180 / Math.PI), tooltip:'Angle of side sensors'},
         {id: 'sensorDistance', label: 'Sensor Dist (px)', type: 'slider', min: 1, max: 30, step: 1, value: this.params.sensorDistance, tooltip:'How far ahead sensors look'},
        // Note: Decay is handled by renderer fade param
     ]; }
    getParamValue(paramId) {
         if(paramId === 'turnSpeed' || paramId === 'sensorAngle'){
             return (this.params[paramId] * 180 / Math.PI).toFixed(1); // Convert rad back to deg for display
         }
        return this.params[paramId];
    }
    setParamValue(paramId, value) {
        let needsReset = false;
         const numValue = parseFloat(value);
        if(isNaN(numValue)) return; // Ignore invalid input

         switch(paramId){
             case 'agentCount': this.params.agentCount = Math.max(1, parseInt(numValue)); needsReset=true; break;
             case 'moveSpeed': this.params.moveSpeed = Math.max(0, numValue); break; // Speed changes don't require reset
            case 'turnSpeed': this.params.turnSpeed = degreesToRadians(Math.max(0, numValue)); break;
            case 'sensorAngle': this.params.sensorAngle = degreesToRadians(Math.max(0, numValue)); break;
             case 'sensorDistance': this.params.sensorDistance = Math.max(1, numValue); break;
            default: console.warn("SlimeMold unknown param set:", paramId);
        }
        if(needsReset) this.reset();
    }

} // End SlimeMold