// p5.js sketch
let simulation;
let canvasSize;
let audioContext;
let audioInitialized = false;

function setup() {
// Calculate canvas size based on window height
canvasSize = min(windowHeight - 40, 700);

const canvas = createCanvas(canvasSize, canvasSize);
canvas.parent('canvas-container');

simulation = new ThreeBodySimulation();
simulation.setupControls();

// Initialize audio on first user interaction
document.addEventListener('click', initializeAudio, { once: true });
}

function initializeAudio() {
if (!audioInitialized) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    simulation.setupAudio(audioContext);
    audioInitialized = true;
}
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
    this.audioContext = null;
    this.lastBoundaryCollision = [0, 0, 0];
    this.lastBodyInteraction = {};
    
    this.initializeBodies();
}

setupAudio(audioContext) {
    this.audioContext = audioContext;
    console.log("Audio initialized");
}

playBoundaryCollisionSound(body, impactStrength) {
if (!this.audioContext || this.paused) return;

const now = this.audioContext.currentTime;
const minTimeBetweenCollisions = 0.1; // seconds

// Prevent too many rapid collision sounds
if (now - this.lastBoundaryCollision[body.id - 1] < minTimeBetweenCollisions) {
    return;
}
this.lastBoundaryCollision[body.id - 1] = now;

// Use your musical notes system
const notes = [220, 247, 262, 294, 330, 349, 392];
const note = notes[Math.floor(Math.random() * notes.length)];
this.playNote(note, impactStrength);
}

playNote(frequency, impactStrength = 0.5, duration = 0.2) {
    if (!this.audioContext) return;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.value = frequency;
    filter.type = "lowpass";
    filter.frequency.value = 800 + Math.random() * 400;
    
    // Scale volume based on impact strength
    const volume = 0.08 * impactStrength;
    gain.gain.setValueAtTime(volume, this.audioContext.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
}

calculateHarmonicFrequencies(body1, body2, closeness) {
    // Base frequency from body properties and distance
    const baseFreq = 220 + (body1.mass + body2.mass) * 0.1;
    
    // Create a harmonic series based on the chord progression
    const harmonics = [
        baseFreq,                    // Fundamental
        baseFreq * 1.2,             // Minor third
        baseFreq * 1.5,             // Perfect fifth
        baseFreq * 2,               // Octave
        baseFreq * 2.4,             // Octave + minor third
    ];
    
    // Filter harmonics based on closeness (more harmonics when closer)
    return harmonics.slice(0, 2 + Math.floor(closeness * 3));
}

playNoiseBurst(amplitude, startTime) {
    const bufferSize = this.audioContext.sampleRate * 0.1;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    
    // Generate pink noise (more natural sounding)
    for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    
    const noiseSource = this.audioContext.createBufferSource();
    const noiseGain = this.audioContext.createGain();
    
    noiseSource.buffer = buffer;
    // Reduced volume by 50%
    noiseGain.gain.setValueAtTime(amplitude * 0.05, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
    
    noiseSource.connect(noiseGain);
    noiseGain.connect(this.audioContext.destination);
    
    noiseSource.start(startTime);
    noiseSource.stop(startTime + 0.1);
}

playGravitationalSound(body1, body2, closeness) {
    if (!this.audioContext || this.paused) return;
    
    const now = this.audioContext.currentTime;
    const interactionKey = `${Math.min(body1.id, body2.id)}-${Math.max(body1.id, body2.id)}`;
    const minTimeBetweenInteractions = 0.3; // seconds
    
    // Prevent too many rapid interaction sounds
    if (this.lastBodyInteraction[interactionKey] && 
        now - this.lastBodyInteraction[interactionKey] < minTimeBetweenInteractions) {
        return;
    }
    this.lastBodyInteraction[interactionKey] = now;
    
    // Create a beautiful chord-like sound for gravitational interaction
    const frequencies = this.calculateHarmonicFrequencies(body1, body2, closeness);
    
    frequencies.forEach((freq, index) => {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const panNode = this.audioContext.createStereoPanner();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, now);
        
        // Gentle panning based on body positions
        const pan = (body1.x - body2.x) / width;
        panNode.pan.setValueAtTime(constrain(pan, -0.7, 0.7), now);
        
        // Volume envelope - gentle swell and fade (reduced volume by 60%)
        const delay = index * 0.02;
        const duration = 1.5 + index * 0.1;
        
        gainNode.gain.setValueAtTime(0, now + delay);
        gainNode.gain.linearRampToValueAtTime(closeness * 0.06, now + delay + 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(panNode);
        panNode.connect(this.audioContext.destination);
        
        oscillator.start(now + delay);
        oscillator.stop(now + delay + duration);
    });
    
    // Add a subtle low-frequency oscillator for warmth
    this.playLFOSweep(closeness, now);
}

playLFOSweep(amplitude, startTime) {
    const oscillator = this.audioContext.createOscillator();
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();
    const gainNode = this.audioContext.createGain();
    
    // Very low frequency oscillator
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(55, startTime);
    
    // LFO for subtle pitch variation
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.5, startTime);
    lfoGain.gain.setValueAtTime(2, startTime);
    
    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);
    
    // Volume envelope (reduced volume by 60%)
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(amplitude * 0.032, startTime + 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 3);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    lfo.start(startTime);
    oscillator.start(startTime);
    
    lfo.stop(startTime + 3);
    oscillator.stop(startTime + 3);
}

playDeflectionSound(body1, body2, forceMagnitude) {
    if (!this.audioContext || this.paused) return;
    
    const now = this.audioContext.currentTime;
    
    // Create a "whoosh" sound for deflection
    const oscillator = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = 'sawtooth';
    
    // Frequency sweep for whoosh effect
    const startFreq = 300 + forceMagnitude * 100;
    const endFreq = 80;
    
    oscillator.frequency.setValueAtTime(startFreq, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, now + 0.4);
    
    // Filter sweep
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);
    
    // Volume envelope (reduced volume by 50%)
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(forceMagnitude * 0.1, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.start(now);
    oscillator.stop(now + 0.4);
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
            trail: [],
            lastBoundaryCollision: 0
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
            trail: [],
            lastBoundaryCollision: 0
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
            trail: [],
            lastBoundaryCollision: 0
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
            
            // Check for close approach for sound effects
            const minDistanceForSound = 100;
            const maxDistanceForSound = 300;
            
            if (distance < maxDistanceForSound) {
                const closeness = 1 - (distance - minDistanceForSound) / (maxDistanceForSound - minDistanceForSound);
                if (closeness > 0) {
                    this.playGravitationalSound(body1, body2, closeness);
                }
            }
            
            // Check for deflection (significant force change)
            if (force > 50 && distance < 150) {
                this.playDeflectionSound(body1, body2, force / 100);
            }
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
        
        // Calculate impact strength based on velocity
        const impactStrength = Math.min(1, Math.abs(dotProduct) / 5);
        
        // Play collision sound
        this.playBoundaryCollisionSound(body, impactStrength);
        
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