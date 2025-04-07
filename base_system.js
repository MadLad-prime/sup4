// --- Base System Class ---
export class GenerativeSystem {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.iteration = 0;
        this.name = "Base System";
    }
    step() { this.iteration++; }
    reset() { this.iteration = 0; }
    getParameters() { return []; }
    getParamValue(paramId) { return undefined; }
    setParamValue(paramId, value) {}
    getIteration() { return this.iteration; }
    getPopulation() { return '-'; }
    getVisualizationHints() { return {}; }
    getInteractionHint() { return 'Observing'; }
    handleMouseDown(x, y, button) {}
    handleMouseMove(x, y) {}
    handleMouseUp(x, y) {}
    onResize(newWidth, newHeight) { this.width = newWidth; this.height = newHeight; }
    destroy() {}
    updateRendererBuffer(renderer) {}
}
