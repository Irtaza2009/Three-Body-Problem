// p5.js sketch
let simulation;
let canvasSize;

function setup() {
    // Calculate canvas size based on window height
    canvasSize = min(windowHeight - 40, 700);
    
    const canvas = createCanvas(canvasSize, canvasSize);
    canvas.parent('canvas-container');
    
    simulation = new ThreeBodySimulation();
    simulation.setupControls();
}

function draw() {
    // Clear with dark background
    background(10, 10, 20);
    
    // Draw circular boundary
    noFill();
    stroke(42, 42, 58);
    strokeWeight(2);
    ellipse(width/2, height/2, width, height);
    
    if (!simulation.paused) {
        simulation.update();
    }
    
    simulation.display();
}

function windowResized() {
    canvasSize = min(windowHeight - 40, 700);
    resizeCanvas(canvasSize, canvasSize);
    // Reinitialize bodies with new canvas dimensions
    simulation.reset();
}

class ThreeBodySimulation {
    constructor() {
        this.G = 150;
        this.timeStep = 0.02;
        this.trailLength = 400;
        this.trailWidth = 3;
        this.showTrails = true;
        this.paused = false;
        this.boundaryRadius = 0;
        
        this.initializeBodies();
    }
    
    initializeBodies() {
        this.boundaryRadius = width / 2;
        
        this.bodies = [
            {
                id: 1,
                x: width / 2 - 120,
                y: height / 2,
                vx: 0,
                vy: 2.2,
                mass: 120,
                radius: 16,
                color: [220, 100, 100],
                trail: []
            },
            {
                id: 2,
                x: width / 2 + 120,
                y: height / 2,
                vx: 0,
                vy: -2.2,
                mass: 120,
                radius: 16,
                color: [100, 150, 220],
                trail: []
            },
            {
                id: 3,
                x: width / 2,
                y: height / 2 - 120,
                vx: 2.2,
                vy: 0,
                mass: 120,
                radius: 16,
                color: [120, 220, 120],
                trail: []
            }
        ];
    }
    
    setupControls() {
        // Time step slider
        const timeStepSlider = document.getElementById('timeStep');
        const timeStepValue = document.getElementById('timeStepValue');
        
        timeStepSlider.addEventListener('input', (e) => {
            this.timeStep = parseFloat(e.target.value);
            timeStepValue.textContent = this.timeStep.toFixed(3);
        });
        
        // Trail length slider
        const trailLengthSlider = document.getElementById('trailLength');
        const trailLengthValue = document.getElementById('trailLengthValue');
        
        trailLengthSlider.addEventListener('input', (e) => {
            this.trailLength = parseInt(e.target.value);
            trailLengthValue.textContent = this.trailLength;
        });
        
        // Trail width slider
        const trailWidthSlider = document.getElementById('trailWidth');
        const trailWidthValue = document.getElementById('trailWidthValue');
        
        trailWidthSlider.addEventListener('input', (e) => {
            this.trailWidth = parseFloat(e.target.value);
            trailWidthValue.textContent = this.trailWidth;
        });
        
        // Show trails checkbox
        const showTrailsCheckbox = document.getElementById('showTrails');
        showTrailsCheckbox.addEventListener('change', (e) => {
            this.showTrails = e.target.checked;
        });
        
        // Pause checkbox
        const pausedCheckbox = document.getElementById('paused');
        pausedCheckbox.addEventListener('change', (e) => {
            this.paused = e.target.checked;
        });
        
        // Reset button
        const resetBtn = document.getElementById('resetBtn');
        resetBtn.addEventListener('click', () => {
            this.reset();
        });
        
        // Randomize button
        const randomizeBtn = document.getElementById('randomizeBtn');
        randomizeBtn.addEventListener('click', () => {
            this.randomize();
        });
        
        // Create body controls
        this.createBodyControls();
    }
    
    createBodyControls() {
        const bodyControlsContainer = document.getElementById('bodyControls');
        bodyControlsContainer.innerHTML = '';
        
        const colors = [
            { name: "Red", value: [220, 100, 100] },
            { name: "Blue", value: [100, 150, 220] },
            { name: "Green", value: [120, 220, 120] }
        ];
        
        this.bodies.forEach((body, index) => {
            const bodyControl = document.createElement('div');
            bodyControl.className = 'body-control';
            bodyControl.style.borderLeftColor = `rgb(${body.color[0]}, ${body.color[1]}, ${body.color[2]})`;
            
            bodyControl.innerHTML = `
                <div class="body-header">
                    <div class="color-indicator" style="background-color: rgb(${body.color[0]}, ${body.color[1]}, ${body.color[2]})"></div>
                    <div class="body-title">${colors[index].name} Body</div>
                </div>
                <div class="setting">
                    <label for="mass${body.id}">Mass</label>
                    <div class="slider-container">
                        <input type="range" id="mass${body.id}" value="${body.mass}" min="50" max="300" step="10">
                        <span class="value-display" id="massValue${body.id}">${body.mass}</span>
                    </div>
                </div>
                <div class="setting">
                    <label for="radius${body.id}">Radius</label>
                    <div class="slider-container">
                        <input type="range" id="radius${body.id}" value="${body.radius}" min="5" max="25" step="1">
                        <span class="value-display" id="radiusValue${body.id}">${body.radius}</span>
                    </div>
                </div>
                <div class="setting">
                    <label for="vx${body.id}">Velocity X</label>
                    <div class="slider-container">
                        <input type="range" id="vx${body.id}" value="${body.vx.toFixed(2)}" min="-5" max="5" step="0.1">
                        <span class="value-display" id="vxValue${body.id}">${body.vx.toFixed(2)}</span>
                    </div>
                </div>
                <div class="setting">
                    <label for="vy${body.id}">Velocity Y</label>
                    <div class="slider-container">
                        <input type="range" id="vy${body.id}" value="${body.vy.toFixed(2)}" min="-5" max="5" step="0.1">
                        <span class="value-display" id="vyValue${body.id}">${body.vy.toFixed(2)}</span>
                    </div>
                </div>
            `;
            
            bodyControlsContainer.appendChild(bodyControl);
            
            // Add event listeners for body properties
            document.getElementById(`mass${body.id}`).addEventListener('input', (e) => {
                body.mass = parseFloat(e.target.value);
                document.getElementById(`massValue${body.id}`).textContent = body.mass;
            });
            
            document.getElementById(`radius${body.id}`).addEventListener('input', (e) => {
                body.radius = parseFloat(e.target.value);
                document.getElementById(`radiusValue${body.id}`).textContent = body.radius;
            });
            
            document.getElementById(`vx${body.id}`).addEventListener('input', (e) => {
                body.vx = parseFloat(e.target.value);
                document.getElementById(`vxValue${body.id}`).textContent = body.vx.toFixed(2);
            });
            
            document.getElementById(`vy${body.id}`).addEventListener('input', (e) => {
                body.vy = parseFloat(e.target.value);
                document.getElementById(`vyValue${body.id}`).textContent = body.vy.toFixed(2);
            });
        });
    }
    
    reset() {
        this.initializeBodies();
        this.createBodyControls();
    }
    
    randomize() {
        const centerX = width / 2;
        const centerY = height / 2;
        const maxDistance = this.boundaryRadius * 0.8; // Keep within boundary
        
        this.bodies.forEach(body => {
            // Random position within circular boundary
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * maxDistance;
            body.x = centerX + Math.cos(angle) * distance;
            body.y = centerY + Math.sin(angle) * distance;
            
            // Random velocity
            body.vx = (Math.random() - 0.5) * 5;
            body.vy = (Math.random() - 0.5) * 5;
            
            // Random mass and radius
            body.mass = 50 + Math.random() * 200;
            body.radius = 8 + Math.random() * 12;
            
            // Reset trail
            body.trail = [];
        });
        
        this.createBodyControls();
    }
    
    calculateForces() {
        // Reset forces
        this.bodies.forEach(body => {
            body.fx = 0;
            body.fy = 0;
        });
        
        // Calculate gravitational forces between all pairs of bodies
        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                const body1 = this.bodies[i];
                const body2 = this.bodies[j];
                
                // Calculate distance
                const dx = body2.x - body1.x;
                const dy = body2.y - body1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Avoid division by zero
                if (distance === 0) continue;
                
                // Calculate force magnitude
                const force = this.G * body1.mass * body2.mass / (distance * distance);
                
                // Calculate force components
                const fx = force * dx / distance;
                const fy = force * dy / distance;
                
                // Apply forces (Newton's third law)
                body1.fx += fx;
                body1.fy += fy;
                body2.fx -= fx;
                body2.fy -= fy;
            }
        }
    }
    
    handleBoundaryCollision(body) {
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Calculate distance from center
        const dx = body.x - centerX;
        const dy = body.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if body is outside boundary (with some tolerance)
        if (distance + body.radius > this.boundaryRadius) {
            // Calculate normal vector (pointing from center to body)
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Calculate dot product of velocity and normal
            const dotProduct = body.vx * nx + body.vy * ny;
            
            // Reflect velocity across the normal (bounce)
            body.vx = body.vx - 2 * dotProduct * nx;
            body.vy = body.vy - 2 * dotProduct * ny;
            
            // Apply energy loss
            body.vx *= 0.95;
            body.vy *= 0.95;
            
            // Reposition body to be exactly at the boundary
            const correctionDistance = (distance + body.radius) - this.boundaryRadius;
            body.x -= nx * correctionDistance;
            body.y -= ny * correctionDistance;
        }
    }
    
    update() {
        // Calculate forces
        this.calculateForces();
        
        // Update positions and velocities using Euler integration
        this.bodies.forEach(body => {
            // Acceleration = Force / Mass
            const ax = body.fx / body.mass;
            const ay = body.fy / body.mass;
            
            // Update velocity
            body.vx += ax * this.timeStep;
            body.vy += ay * this.timeStep;
            
            // Update position
            body.x += body.vx * this.timeStep;
            body.y += body.vy * this.timeStep;
            
            // Handle circular boundary collision
            this.handleBoundaryCollision(body);
            
            // Add current position to trail
            if (this.showTrails) {
                body.trail.push({ x: body.x, y: body.y });
                
                // Limit trail length
                if (body.trail.length > this.trailLength) {
                    body.trail.shift();
                }
            }
        });
    }
    
    display() {
        // Draw trails
        if (this.showTrails) {
            this.bodies.forEach(body => {
                if (body.trail.length > 1) {
                    for (let i = 1; i < body.trail.length; i++) {
                        const prev = body.trail[i-1];
                        const curr = body.trail[i];
                        
                        // Calculate alpha based on position in trail
                        const alpha = map(i, 0, body.trail.length, 30, 200);
                        
                        // Calculate trail width based on position
                        const trailWidth = map(i, 0, body.trail.length, 0.5, this.trailWidth);
                        
                        stroke(body.color[0], body.color[1], body.color[2], alpha);
                        strokeWeight(trailWidth);
                        line(prev.x, prev.y, curr.x, curr.y);
                    }
                }
            });
        }
        
        // Draw bodies
        this.bodies.forEach(body => {
            // Main body
            fill(body.color[0], body.color[1], body.color[2]);
            noStroke();
            ellipse(body.x, body.y, body.radius * 2);
        });
    }
}