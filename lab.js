import CanvasRenderer from './canvas_renderer.js'; // Keep this
import { createSystemInstance } from './system_factory.js'; // This path is fine

document.addEventListener('DOMContentLoaded', () => {
    console.log("GenSys Lab Initializing...");

    // --- DOM Elements ---
    const canvas = document.getElementById('simulation-canvas');
    const systemTypeSelector = document.getElementById('system-type');
    const playPauseButton = document.getElementById('play-pause-button');
    const playIcon = playPauseButton.querySelector('i');
    const stepButton = document.getElementById('step-button');
    const resetButton = document.getElementById('reset-button');
    const speedSlider = document.getElementById('speed-slider');
    const speedValueDisplay = document.getElementById('speed-value');
    const paramsContainer = document.getElementById('dynamic-params');
    const currentSystemNameDisplay = document.getElementById('current-system-name');
    const iterationCountDisplay = document.getElementById('iteration-count');
    const populationCountDisplay = document.getElementById('population-count');
    const colorPaletteSelector = document.getElementById('color-palette');
    const gridToggle = document.getElementById('toggle-grid');
    const interactionHint = document.getElementById('interaction-hint');

    if (!canvas || !systemTypeSelector || !playPauseButton || !stepButton || !resetButton || !speedSlider || !paramsContainer || !colorPaletteSelector) {
        console.error("Fatal Error: Core UI element not found!");
        return;
    }

    // --- State Variables ---
    let currentSystem = null;
    let renderer = null;
    let isRunning = false;
    let animationFrameId = null;
    let lastTimestamp = 0;
    let targetInterval = 1000 / 10; // Corresponds to initial speed slider value (10 fps)

    // --- Initialize ---
    function initialize() {
        console.log("Setting up simulation environment...");
        renderer = new CanvasRenderer(canvas);
        loadSystem(systemTypeSelector.value); // Load initial system
        setupEventListeners();
        resizeCanvas(); // Initial size adjustment
        updateUI(); // Set initial UI states
        startAnimationLoop(); // Start the loop paused
        console.log("Lab setup complete.");
    }

    // --- System Loading & Management ---
    function loadSystem(systemId) {
        console.log(`Loading system: ${systemId}`);
        isRunning = false; // Pause on system change
        if (currentSystem && typeof currentSystem.destroy === 'function') {
            currentSystem.destroy(); // Clean up previous system if necessary
        }

        currentSystem = createSystemInstance(systemId, canvas.width, canvas.height);

        if (!currentSystem) {
            console.error(`Failed to create instance for system ID: ${systemId}`);
            paramsContainer.innerHTML = `<p>Error loading system.</p>`;
            return;
        }

        currentSystem.reset();
        populateParameterControls();
        renderer.setVisualizationParams({
             gridEnabled: gridToggle.checked,
             palette: colorPaletteSelector.value
        });
        if (typeof currentSystem.getVisualizationHints === 'function'){
             renderer.updateHints(currentSystem.getVisualizationHints());
        }

        updateUI(); // Update buttons, info display
        requestRedraw(); // Draw initial state
    }

    // --- UI Parameter Generation ---
    function populateParameterControls() {
        paramsContainer.innerHTML = ''; // Clear old controls
        const systemParams = currentSystem.getParameters();
        currentSystemNameDisplay.textContent = currentSystem.name || 'Unknown';

        if (!systemParams || Object.keys(systemParams).length === 0) {
            paramsContainer.innerHTML = `<p>No adjustable parameters for this system.</p>`;
            return;
        }

        systemParams.forEach(param => {
            const controlDiv = document.createElement('div');
            controlDiv.classList.add('param-control');

            const label = document.createElement('label');
            label.htmlFor = `param-${param.id}`;
            label.textContent = param.label;
            label.title = param.tooltip || ''; // Add tooltip
            controlDiv.appendChild(label);

            let inputElement;
            switch(param.type) {
                case 'slider':
                    inputElement = document.createElement('input');
                    inputElement.type = 'range';
                    inputElement.min = param.min;
                    inputElement.max = param.max;
                    inputElement.step = param.step;
                    inputElement.value = currentSystem.getParamValue(param.id);
                    // Add value display span
                    const valueSpan = document.createElement('span');
                    valueSpan.classList.add('param-value-display');
                    valueSpan.textContent = inputElement.value;
                    inputElement.addEventListener('input', (e) => {
                         currentSystem.setParamValue(param.id, parseFloat(e.target.value));
                        valueSpan.textContent = e.target.value;
                    });
                    controlDiv.appendChild(inputElement);
                    controlDiv.appendChild(valueSpan);
                    break;
                 case 'number':
                    inputElement = document.createElement('input');
                    inputElement.type = 'number';
                     if(param.min !== undefined) inputElement.min = param.min;
                    if(param.max !== undefined) inputElement.max = param.max;
                    if(param.step !== undefined) inputElement.step = param.step;
                     inputElement.value = currentSystem.getParamValue(param.id);
                     inputElement.addEventListener('change', (e) => { // Use change for number fields
                         currentSystem.setParamValue(param.id, parseFloat(e.target.value));
                     });
                     controlDiv.appendChild(inputElement);
                     break;
                case 'checkbox':
                     inputElement = document.createElement('input');
                    inputElement.type = 'checkbox';
                    inputElement.checked = currentSystem.getParamValue(param.id);
                     inputElement.addEventListener('change', (e) => {
                         currentSystem.setParamValue(param.id, e.target.checked);
                    });
                    // Checkbox is typically smaller, maybe different layout
                     controlDiv.classList.add('param-control-checkbox');
                     controlDiv.appendChild(inputElement);
                     break;
                 case 'textarea': // For L-System rules etc.
                    inputElement = document.createElement('textarea');
                    inputElement.rows = param.rows || 3;
                     inputElement.value = currentSystem.getParamValue(param.id);
                     // Update on blur might be better for textareas
                    inputElement.addEventListener('blur', (e) => {
                         currentSystem.setParamValue(param.id, e.target.value);
                         currentSystem.reset(); // Need to reset L-System on rule change
                         requestRedraw();
                    });
                     controlDiv.appendChild(inputElement);
                     break;
                case 'button': // Trigger actions
                     inputElement = document.createElement('button');
                    inputElement.textContent = param.buttonText || 'Trigger';
                    inputElement.addEventListener('click', () => {
                         if(typeof currentSystem.triggerAction === 'function'){
                             currentSystem.triggerAction(param.id);
                         }
                         requestRedraw();
                    });
                     controlDiv.appendChild(inputElement);
                     break;

                // Add more types as needed (select, color picker)
                default:
                     inputElement = document.createElement('input');
                     inputElement.type = 'text';
                     inputElement.value = currentSystem.getParamValue(param.id);
                    inputElement.addEventListener('change', (e) => {
                         currentSystem.setParamValue(param.id, e.target.value);
                    });
                    controlDiv.appendChild(inputElement);
            }
            inputElement.id = `param-${param.id}`; // Link label and input
            paramsContainer.appendChild(controlDiv);
        });
    }

    // --- Animation Loop & Simulation Step ---
    function startAnimationLoop() {
        if (!animationFrameId) {
            console.log("Starting animation loop.");
            lastTimestamp = performance.now();
            animationFrameId = requestAnimationFrame(animationLoop);
        }
    }

    function stopAnimationLoop() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            console.log("Animation loop stopped.");
        }
    }

    function animationLoop(timestamp) {
        animationFrameId = requestAnimationFrame(animationLoop); // Schedule next frame

        const deltaTime = timestamp - lastTimestamp;

        // Only step simulation if running and enough time has passed
        if (isRunning && deltaTime >= targetInterval) {
            lastTimestamp = timestamp - (deltaTime % targetInterval); // Adjust timestamp to maintain interval
            stepSimulation(); // Ensure the system steps
            requestRedraw(); // Redraw after stepping
        } else if (!isRunning) {
            lastTimestamp = timestamp; // Prevent large jump on resume
        }
    }

    function stepSimulation() {
        if (currentSystem && typeof currentSystem.step === 'function') {
             try{
                currentSystem.step();
                 updateInfoDisplay(); // Update iteration count etc.
             } catch (e){
                 console.error("Error during simulation step:", e);
                 isRunning = false; // Stop on error
                 updateUI();
            }
        }
    }

    function requestRedraw() {
        // Basic redraw implementation
        // Could be smarter (only draw if needed, requestAnimationFrame decoupling)
         if (renderer && currentSystem) {
            renderer.render(currentSystem);
         }
     }


    // --- UI Updates & Event Handlers ---
    function updateUI() {
         // Update Play/Pause button state
         playPauseButton.classList.toggle('active', isRunning);
         playIcon.className = isRunning ? 'fas fa-pause' : 'fas fa-play'; // Toggle icon

         // Update speed display
        speedValueDisplay.textContent = `${speedSlider.value} fps`;
        targetInterval = 1000 / parseInt(speedSlider.value, 10);

         // Update simulation info display
         updateInfoDisplay();

         // Update Interaction Hint
         if (currentSystem && typeof currentSystem.getInteractionHint === 'function') {
             interactionHint.textContent = `Mode: ${currentSystem.getInteractionHint()}`;
         } else {
             interactionHint.textContent = 'Mode: Observing';
         }
     }

    function updateInfoDisplay() {
        if (!currentSystem || !iterationCountDisplay || !populationCountDisplay) return;
        iterationCountDisplay.textContent = currentSystem.getIteration ? currentSystem.getIteration() : '-';
        populationCountDisplay.textContent = currentSystem.getPopulation ? currentSystem.getPopulation() : '-';
        // Update other system-specific info if elements exist
     }

     function setupEventListeners() {
        // System Selector
         systemTypeSelector.addEventListener('change', (e) => {
            loadSystem(e.target.value);
         });

        // Simulation Controls
        playPauseButton.addEventListener('click', () => {
            isRunning = !isRunning;
            if (isRunning) {
                lastTimestamp = performance.now(); // Reset timer on play
                startAnimationLoop(); // Ensure the animation loop starts
            } else {
                stopAnimationLoop(); // Stop the loop when paused
            }
            updateUI();
            console.log(isRunning ? "Simulation Resumed" : "Simulation Paused");
        });
        stepButton.addEventListener('click', () => {
            if (!isRunning) { // Only allow step when paused
                stepSimulation();
                requestRedraw();
            }
         });
        resetButton.addEventListener('click', () => {
            if (currentSystem) {
                isRunning = false; // Pause on reset
                currentSystem.reset();
                updateUI();
                requestRedraw();
                 console.log("Simulation Reset.");
            }
        });
        speedSlider.addEventListener('input', () => {
            updateUI(); // Update display and targetInterval
        });

         // Visualization Controls
        colorPaletteSelector.addEventListener('change', (e) => {
            if (renderer) {
                renderer.setVisualizationParams({ palette: e.target.value });
                requestRedraw();
            }
         });
        gridToggle.addEventListener('change', (e) => {
            if (renderer) {
                 renderer.setVisualizationParams({ gridEnabled: e.target.checked });
                 requestRedraw();
            }
         });

        // Canvas Interaction
        let isDrawing = false;
        canvas.addEventListener('mousedown', (e) => {
            if (currentSystem && typeof currentSystem.handleMouseDown === 'function') {
                const coords = getCanvasCoords(e);
                if (coords) {
                    isDrawing = true;
                    currentSystem.handleMouseDown(coords.x, coords.y, e.button);
                    requestRedraw();
                 }
             }
         });
        canvas.addEventListener('mousemove', (e) => {
            if (isDrawing && currentSystem && typeof currentSystem.handleMouseMove === 'function') {
                const coords = getCanvasCoords(e);
                 if (coords) {
                    currentSystem.handleMouseMove(coords.x, coords.y);
                    requestRedraw();
                }
            }
             // Maybe update interaction hint based on hover?
         });
        canvas.addEventListener('mouseup', (e) => {
            if (isDrawing) {
                 isDrawing = false;
                if (currentSystem && typeof currentSystem.handleMouseUp === 'function') {
                    const coords = getCanvasCoords(e);
                     if(coords) currentSystem.handleMouseUp(coords.x, coords.y);
                    // Maybe trigger final redraw or action
                     requestRedraw();
                }
             }
         });
         canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent right-click menu


        // Window Resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
             clearTimeout(resizeTimeout);
             resizeTimeout = setTimeout(() => {
                console.log("Window resized.");
                resizeCanvas();
                // Notify system and renderer about resize
                if (currentSystem && typeof currentSystem.onResize === 'function') {
                    currentSystem.onResize(canvas.width, canvas.height);
                }
                 if (renderer) {
                    renderer.onResize(); // Renderer might need internal adjustments
                }
                requestRedraw(); // Redraw after resize
             }, 250); // Debounce resize
        });
     }

     // --- Utility Functions ---
    function getCanvasCoords(event) {
         const rect = canvas.getBoundingClientRect();
        const x = Math.floor(event.clientX - rect.left);
        const y = Math.floor(event.clientY - rect.top);
         // Basic bounds check
         if(x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
             return { x, y };
         }
        return null; // Click was outside canvas bounds
     }

     function resizeCanvas() {
         const container = canvas.parentElement;
         const width = container.clientWidth;
         const height = container.clientHeight;
         // Check if size actually changed to avoid unnecessary operations
        if(canvas.width !== width || canvas.height !== height){
            canvas.width = width;
             canvas.height = height;
            console.log(`Canvas resized to: ${width}x${height}`);
            return true; // Indicates resize happened
        }
        return false;
     }

    // --- Start ---
    initialize();
});