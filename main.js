const boat = {
    x: 0,
    y: 0,
    angle: 0,
    width: 40,
    height: 80,
    leftThrottle: 0,
    rightThrottle: 0,
    rudder: 0, // -1 to 1
    vx: 0,
    vy: 0,
    va: 0,
    visualEngineAngle: 0
};

window.togglePanel = function(id) {
    const el = document.getElementById(id);
    el.classList.toggle('collapsed');
    const btn = el.querySelector('.collapse-btn');
    if (el.classList.contains('collapsed')) {
        btn.textContent = btn.textContent.replace('▼', '▶');
    } else {
        btn.textContent = btn.textContent.replace('▶', '▼');
    }
};

const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

const leftFill = document.getElementById('left-throttle-fill');
const rightFill = document.getElementById('right-throttle-fill');
const rudderEl = document.getElementById('rudder-val');
const rudderFill = document.getElementById('rudder-fill');
const diffThrustSlider = document.getElementById('diffThrustSlider');
const diffThrustInput = document.getElementById('diffThrustInput');
const steerTorqueSlider = document.getElementById('steerTorqueSlider');
const steerTorqueInput = document.getElementById('steerTorqueInput');
const steerSensSlider = document.getElementById('steerSensSlider');
const steerSensInput = document.getElementById('steerSensInput');
const dragSlider = document.getElementById('dragSlider');
const dragInput = document.getElementById('dragInput');
const creepSlider = document.getElementById('creepSlider');
const creepInput = document.getElementById('creepInput');
const powerSlider = document.getElementById('powerSlider');
const powerInput = document.getElementById('powerInput');
const driftSlider = document.getElementById('driftSlider');
const driftInput = document.getElementById('driftInput');

const windDirSlider = document.getElementById('windDirSlider');
const windDirInput = document.getElementById('windDirInput');
const windSpeedSlider = document.getElementById('windSpeedSlider');
const windSpeedInput = document.getElementById('windSpeedInput');
const windForceSlider = document.getElementById('windForceSlider');
const windForceInput = document.getElementById('windForceInput');
const beamMultSlider = document.getElementById('beamMultSlider');
const beamMultInput = document.getElementById('beamMultInput');
const latDragSlider = document.getElementById('latDragSlider');
const latDragInput = document.getElementById('latDragInput');
const windArrow = document.getElementById('wind-arrow');
const steeringNeedle = document.getElementById('steering-needle');
const steeringValue = document.getElementById('steering-value');
const speedValue = document.getElementById('speed-value');
const speedNeedle = document.getElementById('speed-needle');
const headingValue = document.getElementById('heading-value');
const compassNeedle = document.getElementById('compass-needle');
const boatColorPicker = document.getElementById('boatColorPicker');
const thrusterSlider = document.getElementById('thrusterSlider');
const thrusterInput = document.getElementById('thrusterInput');
const thrusterSwitchBtn = document.getElementById('thrusterSwitchBtn');

let thrusterConfig = { port: 'e', stbd: 'u' };
if (thrusterSwitchBtn) {
    thrusterSwitchBtn.addEventListener('click', () => {
        if (thrusterConfig.port === 'e') {
            thrusterConfig = { port: 'u', stbd: 'e' };
            thrusterSwitchBtn.textContent = "U=PORT, E=STBD (Click to Swap)";
        } else {
            thrusterConfig = { port: 'e', stbd: 'u' };
            thrusterSwitchBtn.textContent = "E=PORT, U=STBD (Click to Swap)";
        }
    });
}
const anchorBtn = document.getElementById('anchorBtn');
const rodeInfo = document.getElementById('rode-info');
const rodeLengthEl = document.getElementById('rode-length');
const payOutBtn = document.getElementById('payOutBtn');
const haulInBtn = document.getElementById('haulInBtn');

// Anchor state
const anchor = {
    dropped: false,
    x: 0,
    y: 0,
    rodeLength: 0,
    maxRode: 300,
    tension: 0
};

function toggleAnchor() {
    anchor.dropped = !anchor.dropped;
    if (Object.keys(boat).length === 0) return;
    if (anchor.dropped) {
        anchor.x = boat.x + Math.cos(boat.angle) * (boat.height / 2);
        anchor.y = boat.y + Math.sin(boat.angle) * (boat.height / 2);
        anchor.rodeLength = 20; // Initial drop depth + a little
        anchorBtn.textContent = "RAISE ANCHOR (SPACE)";
        anchorBtn.style.background = "#c0392b";
        rodeInfo.style.display = "block";
    } else {
        anchor.dropped = false;
        anchor.rodeLength = 0;
        anchorBtn.textContent = "DROP ANCHOR (SPACE)";
        anchorBtn.style.background = "#2c3e50";
        rodeInfo.style.display = "none";
    }
}

anchorBtn.addEventListener('click', toggleAnchor);
payOutBtn.addEventListener('mousedown', () => anchor.payingOut = true);
window.addEventListener('mouseup', () => anchor.payingOut = false);
haulInBtn.addEventListener('mousedown', () => anchor.haulingIn = true);
window.addEventListener('mouseup', () => anchor.haulingIn = false);

// Wind particles state
const windLines = [];
for (let i = 0; i < 30; i++) {
    windLines.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        len: 20 + Math.random() * 40
    });
}

const windDial = document.getElementById('wind-dial');
const windDialArrow = document.getElementById('wind-dial-arrow');
const windDialHandle = document.getElementById('wind-dial-handle');

function updateWindDial(degrees) {
    windDialArrow.style.transform = `translate(-50%, -50%) rotate(${degrees}deg)`;
    const rad = (degrees - 90) * (Math.PI / 180);
    const x = Math.cos(rad) * 34;
    const y = Math.sin(rad) * 34;
    windDialHandle.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
}

function handleDialRotate(e) {
    const rect = windDial.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const angle = Math.atan2(clientY - centerY, clientX - centerX);
    let degrees = angle * (180 / Math.PI) + 90;
    if (degrees < 0) degrees += 360;
    
    windDirSlider.value = Math.round(degrees);
    windDirInput.value = Math.round(degrees);
    updateWindDial(degrees);
    
    // Trigger callback manually for particles/logic
    const windDir = (parseFloat(degrees) - 90) * (Math.PI / 180);
    // Logic that depends on windDir is in update()
}

let isDraggingDial = false;
windDial.addEventListener('mousedown', (e) => {
    isDraggingDial = true;
    handleDialRotate(e);
});
window.addEventListener('mousemove', (e) => {
    if (isDraggingDial) handleDialRotate(e);
});
window.addEventListener('mouseup', () => {
    isDraggingDial = false;
});
windDial.addEventListener('touchstart', (e) => {
    isDraggingDial = true;
    handleDialRotate(e);
}, {passive: false});
window.addEventListener('touchmove', (e) => {
    if (isDraggingDial) handleDialRotate(e);
}, {passive: false});
window.addEventListener('touchend', () => {
    isDraggingDial = false;
});

// Initial dial state
updateWindDial(windDirSlider.value);

// Sync sliders and inputs
function syncInputs(slider, input, callback) {
    if(!slider || !input) return;
    slider.addEventListener('input', () => {
        input.value = slider.value;
        if(callback) callback(slider.value);
    });
    input.addEventListener('input', () => {
        slider.value = input.value;
        if(callback) callback(input.value);
    });
}
syncInputs(diffThrustSlider, diffThrustInput);
syncInputs(steerTorqueSlider, steerTorqueInput);
syncInputs(steerSensSlider, steerSensInput);
syncInputs(dragSlider, dragInput);
syncInputs(creepSlider, creepInput);
syncInputs(powerSlider, powerInput);
syncInputs(driftSlider, driftInput);
syncInputs(windDirSlider, windDirInput, (val) => {
    updateWindDial(val);
});
syncInputs(windSpeedSlider, windSpeedInput);
syncInputs(windForceSlider, windForceInput);
syncInputs(beamMultSlider, beamMultInput);
syncInputs(latDragSlider, latDragInput);
syncInputs(thrusterSlider, thrusterInput);

// Docking area (Marina Channel Layout)
const docks = [];
function setupDocks() {
    docks.length = 0;
    const pierThickness = 15;
    
    // One long dock at the top
    docks.push({ x: 0, y: 0, w: canvas.width, h: pierThickness });

    // One long dock at the bottom
    docks.push({ x: 0, y: canvas.height - pierThickness, w: canvas.width, h: pierThickness });

    // Middle slips (removing the left ones as requested)
    const slipWidth = 100;
    const slipDepth = 150;
    const startX = 600; // Start slips further right to clear the left side

    for (let i = startX; i < canvas.width - 50; i += slipWidth) {
        // Vertical piers top
        docks.push({ x: i, y: 0, w: 15, h: slipDepth });
        // Vertical piers bottom
        docks.push({ x: i, y: canvas.height - slipDepth, w: 15, h: slipDepth });
    }
}

// Boat state
// Boat initialized at top

function resetBoat() {
    boat.x = canvas.width / 2;
    boat.y = canvas.height / 2;
    boat.angle = -Math.PI / 2; // Bow faces top
    boat.vx = 0;
    boat.vy = 0;
    boat.va = 0;
    boat.leftThrottle = 0;
    boat.rightThrottle = 0;
    boat.rudder = 0;
}

let cameraLocked = true; // Lock by default
const camBtn = document.getElementById('cameraToggleBtn');
function updateCamBtn() {
    if (cameraLocked) {
        camBtn.textContent = "CAMERA LOCK: ON";
        camBtn.classList.remove('toggle-inactive');
    } else {
        camBtn.textContent = "CAMERA LOCK: OFF";
        camBtn.classList.add('toggle-inactive');
    }
}
camBtn.addEventListener('click', () => {
    cameraLocked = !cameraLocked;
    updateCamBtn();
});

// Resize handling
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    setupDocks();
    resetBoat();
}
window.addEventListener('resize', resize);

const keys = {};
window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    keys[key] = true;
    if (key === 'r') resetBoat();
    if (key === 'p') anchor.payingOut = true;
    if (key === 'l') anchor.haulingIn = true;
    if (key === ' ') {
        e.preventDefault();
        toggleAnchor();
    }
    if (key === 't') {
        cameraLocked = !cameraLocked;
        updateCamBtn();
    }
});
window.addEventListener('keyup', e => {
    const key = e.key.toLowerCase();
    keys[key] = false;
    if (key === 'p') anchor.payingOut = false;
    if (key === 'l') anchor.haulingIn = false;
});

resize();

function update() {
    if (isNaN(boat.x) || isNaN(boat.y)) resetBoat();
    // Throttle input
    if (keys['w']) boat.leftThrottle = Math.min(1, boat.leftThrottle + 0.05);
    else if (keys['s']) boat.leftThrottle = Math.max(-1, boat.leftThrottle - 0.05);
    else boat.leftThrottle *= 0.95;

    if (keys['i']) boat.rightThrottle = Math.min(1, boat.rightThrottle + 0.05);
    else if (keys['k']) boat.rightThrottle = Math.max(-1, boat.rightThrottle - 0.05);
    else boat.rightThrottle *= 0.95;

    // Engine Angle Steering
    if (keys['d']) boat.rudder = Math.max(-1, boat.rudder - 0.05);
    else if (keys['a']) boat.rudder = Math.min(1, boat.rudder + 0.05);
    else if (keys['f']) boat.rudder = 0;

    // Bow Thruster
    const thrusterForce = parseFloat(thrusterSlider?.value || 0.003); 
    if (keys[thrusterConfig.port]) {
        // Moves bow to port
        const fx = Math.cos(boat.angle - Math.PI/2) * thrusterForce;
        const fy = Math.sin(boat.angle - Math.PI/2) * thrusterForce;
        boat.vx += fx;
        boat.vy += fy;
        boat.va -= thrusterForce / 10; 
    }
    if (keys[thrusterConfig.stbd]) {
        // Moves bow to stbd
        const fx = Math.cos(boat.angle + Math.PI/2) * thrusterForce;
        const fy = Math.sin(boat.angle + Math.PI/2) * thrusterForce;
        boat.vx += fx;
        boat.vy += fy;
        boat.va += thrusterForce / 10; 
    }

    // Physics
    const currentPower = parseFloat(powerSlider?.value || 0.01);
    const engineAngle = (boat.rudder || 0) * 0.78; // ~45 degrees max

    const leftThrustX = Math.cos((boat.angle || 0) + engineAngle) * ((boat.leftThrottle || 0) * currentPower);
    const leftThrustY = Math.sin((boat.angle || 0) + engineAngle) * ((boat.leftThrottle || 0) * currentPower);

    const rightThrustX = Math.cos((boat.angle || 0) + engineAngle) * ((boat.rightThrottle || 0) * currentPower);
    const rightThrustY = Math.sin((boat.angle || 0) + engineAngle) * ((boat.rightThrottle || 0) * currentPower);

    // Linear thrust application
    boat.vx = (boat.vx || 0) + leftThrustX + rightThrustX;
    boat.vy = (boat.vy || 0) + leftThrustY + rightThrustY;

    boat.visualEngineAngle = engineAngle;

    // Torque for rotation
    const steerIntensity = parseFloat(steerTorqueSlider?.value || 5);
    const steerSens = parseFloat(steerSensSlider?.value || 0.02);
    const diffIntensity = parseFloat(diffThrustSlider?.value || 2);
    const lt = boat.leftThrottle || 0;
    const rt = boat.rightThrottle || 0;
    const ea = engineAngle || 0;
    
    const forwardP = (lt + rt) * currentPower;
    // Steering torque (kick)
    const vTorque = -Math.sin(ea) * forwardP * steerSens * steerIntensity;
    
    // Differential thrust rotation
    const diffTorque = (lt - rt) * currentPower * 0.01 * diffIntensity;
    
    boat.va = (boat.va || 0) + (vTorque || 0) + (diffTorque || 0);

    // Lateral "Walking" Force (Prop Walk/Paddlewheel effect)
    let lateralForce = 0;
    const lateralEffect = parseFloat(creepSlider?.value || 0.3); 

    const blt = boat.leftThrottle || 0;
    const brt = boat.rightThrottle || 0;

    if (blt > 0) lateralForce += Math.abs(blt) * lateralEffect;
    else if (blt < 0) lateralForce += Math.abs(blt) * lateralEffect;

    if (brt > 0) lateralForce -= Math.abs(brt) * lateralEffect;
    else if (brt < 0) lateralForce -= Math.abs(brt) * lateralEffect;

    const totalSideForce = (lateralForce || 0) * currentPower;
    
    if (!isNaN(boat.angle)) {
        boat.vx += Math.cos(boat.angle + Math.PI / 2) * totalSideForce;
        boat.vy += Math.sin(boat.angle + Math.PI / 2) * totalSideForce;
    }


    // Drift (Lateral resistance)
    const driftMult = parseFloat(driftSlider?.value || 5);
    const forwardX = Math.cos(boat.angle);
    const forwardY = Math.sin(boat.angle);
    const sideX = Math.cos(boat.angle + Math.PI / 2);
    const sideY = Math.sin(boat.angle + Math.PI / 2);

    // Project velocity onto forward and side vectors
    const vForward = boat.vx * forwardX + boat.vy * forwardY;
    const vSide = boat.vx * sideX + boat.vy * sideY;

    // Apply lateral resistance (High drift = less resistance)
    // Adjusted logic: If drift is high, we preserve more side velocity
    const lateralDragSetting = parseFloat(latDragSlider?.value || 0.0);
    const newVSide = vSide * (1.0 - lateralDragSetting);

    boat.vx = vForward * forwardX + newVSide * sideX;
    boat.vy = vForward * forwardY + newVSide * sideY;

    // Apply movement
    boat.x += boat.vx || 0;
    boat.y += boat.vy || 0;
    boat.angle += boat.va || 0;

    // Friction
    const currentDrag = parseFloat(dragSlider?.value || 0.9);
    boat.vx *= 0.99;
    boat.vy *= 0.99;
    boat.va *= currentDrag; 

    // Anchor Physics
    if (anchor.dropped) {
        if (anchor.payingOut) anchor.rodeLength = Math.min(anchor.maxRode, anchor.rodeLength + 2);
        if (anchor.haulingIn) anchor.rodeLength = Math.max(10, anchor.rodeLength - 2);

        const bowX = boat.x + Math.cos(boat.angle) * (boat.height / 2);
        const bowY = boat.y + Math.sin(boat.angle) * (boat.height / 2);
        const dx = bowX - anchor.x;
        const dy = bowY - anchor.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > anchor.rodeLength) {
            const pullForce = (dist - anchor.rodeLength) * 0.05;
            const angleToAnchor = Math.atan2(anchor.y - bowY, anchor.x - bowX);
            
            // Pull the bow towards anchor
            boat.vx += Math.cos(angleToAnchor) * pullForce;
            boat.vy += Math.sin(angleToAnchor) * pullForce;
            
            // Torque: pull the bow to face the anchor
            const angleDiff = angleToAnchor - boat.angle;
            const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
            boat.va += normalizedDiff * 0.01;
            anchor.tension = pullForce;
        } else {
            anchor.tension = 0;
        }
    }

    // Wind Physics
    const windDir = (parseFloat(windDirSlider?.value || 0) - 90) * (Math.PI / 180);
    const windKnots = parseFloat(windSpeedSlider?.value || 0);
    const windForceBase = windKnots * parseFloat(windForceSlider?.value || 0.015);

    if (!isNaN(windDir) && !isNaN(windKnots)) {
        const relativeWindAngle = windDir - (boat.angle || 0);
        
        // Beam windage: Boats are much more impacted by side wind
        const beamM = parseFloat(beamMultSlider?.value || 1.2);
        const windageMultiplier = 1.0 + Math.abs(Math.sin(relativeWindAngle)) * (beamM - 1); 
        
        // Apply wind force directly
        boat.vx += Math.cos(windDir) * windForceBase * windageMultiplier;
        boat.vy += Math.sin(windDir) * windForceBase * windageMultiplier;
    }

    // Collision Detection (Multi-point to match hull shape)
    const collisionPoints = [
        { x: boat.height / 2, y: 0 },             // Bow
        { x: -boat.height / 2, y: -boat.width / 2 }, // Stern Port
        { x: -boat.height / 2, y: boat.width / 2 },  // Stern Starboard
        { x: 0, y: boat.width / 2 },              // Mid Starboard
        { x: 0, y: -boat.width / 2 }               // Mid Port
    ];

    docks.forEach(dock => {
        collisionPoints.forEach(pt => {
            // Rotate and translate point based on boat state
            const cos = Math.cos(boat.angle);
            const sin = Math.sin(boat.angle);
            const worldX = boat.x + (pt.x * cos - pt.y * sin);
            const worldY = boat.y + (pt.x * sin + pt.y * cos);

            if (worldX > dock.x && worldX < dock.x + dock.w &&
                worldY > dock.y && worldY < dock.y + dock.h) {
                
                // Simple bounce reaction
                boat.x -= boat.vx * 1.5;
                boat.y -= boat.vy * 1.5;
                boat.vx *= -0.3;
                boat.vy *= -0.3;
                boat.va *= 0.5;
            }
        });
    });

    updateUI();
}

function updateUI() {
    leftFill.style.width = Math.abs((boat.leftThrottle || 0) * 100) + '%';
    leftFill.style.background = boat.leftThrottle >= 0 ? '#00ff00' : '#ff3300';
    
    rightFill.style.width = Math.abs((boat.rightThrottle || 0) * 100) + '%';
    rightFill.style.background = boat.rightThrottle >= 0 ? '#00ff00' : '#ff3300';

    const knots = Math.sqrt((boat.vx || 0) * (boat.vx || 0) + (boat.vy || 0) * (boat.vy || 0)) * 10;
    speedValue.textContent = isNaN(knots) ? "0.0" : knots.toFixed(1);
    
    // Speed gauge needle (0 to 15 knots range for visualization)
    const maxVizSpeed = 15;
    const speedRatio = Math.min(knots / maxVizSpeed, 1);
    const speedDeg = -90 + (speedRatio * 180);
    speedNeedle.style.transform = `translateX(-50%) rotate(${speedDeg}deg)`;

    // Update Steering Panel
    const angDeg = (boat.rudder || 0) * 45;
    steeringNeedle.style.transform = `translateX(-50%) rotate(${angDeg}deg)`;
    steeringValue.textContent = `${Math.abs(angDeg).toFixed(0)}° ${angDeg < 0 ? 'STBD' : angDeg > 0 ? 'PORT' : ''}`;

    if (anchor.dropped) {
        rodeLengthEl.textContent = Math.round(anchor.rodeLength);
    }

    // Update Heading Panel
    // Default angle is -Math.PI/2 (up). We want that to be 0 degrees.
    let deg = (boat.angle + Math.PI / 2) * (180 / Math.PI);
    while (deg < 0) deg += 360;
    deg = deg % 360;
    
    compassNeedle.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
    
    let dir = "";
    if (deg >= 337.5 || deg < 22.5) dir = "N";
    else if (deg >= 22.5 && deg < 67.5) dir = "NE";
    else if (deg >= 67.5 && deg < 112.5) dir = "E";
    else if (deg >= 112.5 && deg < 157.5) dir = "SE";
    else if (deg >= 157.5 && deg < 202.5) dir = "S";
    else if (deg >= 202.5 && deg < 247.5) dir = "SW";
    else if (deg >= 247.5 && deg < 292.5) dir = "W";
    else if (deg >= 292.5 && deg < 337.5) dir = "NW";
    
    headingValue.textContent = `${deg.toFixed(0)}° ${dir}`;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Wind Lines (Tiled/Infinite)
    const ws = parseFloat(windSpeedSlider?.value || 0);
    const wd = (parseFloat(windDirSlider?.value || 0) - 90) * (Math.PI / 180);
    
    // Wind line movement is now decoupled from the drawing loop's camera state
    // We update their world positions here
    if (ws > 0) {
        windLines.forEach(wl => {
            wl.x += Math.cos(wd) * (ws / 2 + 1);
            wl.y += Math.sin(wd) * (ws / 2 + 1);
            
            // Wrap wind particles around boat position in world space
            if (wl.x < boat.x - 1000) wl.x += 2000;
            if (wl.x > boat.x + 1000) wl.x -= 2000;
            if (wl.y < boat.y - 1000) wl.y += 2000;
            if (wl.y > boat.y + 1000) wl.y -= 2000;
        });
    }

    ctx.save();
    if (cameraLocked) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-boat.angle - Math.PI / 2);
        ctx.translate(-boat.x, -boat.y);
    }

    // Draw Water
    ctx.fillStyle = '#0077be';
    const waterSize = 5000;
    ctx.fillRect(boat.x - waterSize/2, boat.y - waterSize/2, waterSize, waterSize);
    
    // Draw Grid/Waves
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 100;
    const startGridX = Math.floor((boat.x - 2000) / gridSize) * gridSize;
    const endGridX = Math.ceil((boat.x + 2000) / gridSize) * gridSize;
    const startGridY = Math.floor((boat.y - 2000) / gridSize) * gridSize;
    const endGridY = Math.ceil((boat.y + 2000) / gridSize) * gridSize;

    for (let i = startGridX; i <= endGridX; i += gridSize) {
        ctx.beginPath(); ctx.moveTo(i, startGridY); ctx.lineTo(i, endGridY); ctx.stroke();
    }
    for (let i = startGridY; i <= endGridY; i += gridSize) {
        ctx.beginPath(); ctx.moveTo(startGridX, i); ctx.lineTo(endGridX, i); ctx.stroke();
    }

    if (ws > 0) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.6, 0.1 + ws / 80)})`;
        ctx.lineWidth = 5;
        windLines.forEach(wl => {
            ctx.beginPath();
            ctx.moveTo(wl.x, wl.y);
            ctx.lineTo(wl.x + Math.cos(wd) * wl.len, wl.y + Math.sin(wd) * wl.len);
            ctx.stroke();
        });
    }

    // Draw Docks (Now static in world space)
    ctx.fillStyle = '#5d4037';
    docks.forEach(d => {
        ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.save();
        ctx.strokeStyle = '#3e2723';
        ctx.lineWidth = 1;
        ctx.strokeRect(d.x, d.y, d.w, d.h);
        ctx.restore();
    });

    if (anchor.dropped) {
        const bowX = boat.x + Math.cos(boat.angle) * (boat.height / 2);
        const bowY = boat.y + Math.sin(boat.angle) * (boat.height / 2);
        
        // Draw Rode
        ctx.beginPath();
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.moveTo(bowX, bowY);
        ctx.lineTo(anchor.x, anchor.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Anchor
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Wake
    ctx.save();
    const pivotX = boat.height / 6; 
    ctx.translate(boat.x, boat.y);
    ctx.rotate(boat.angle);
    ctx.translate(-pivotX, 0);

    if (Math.abs(boat.vx || 0) + Math.abs(boat.vy || 0) > 0.1) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.moveTo(-boat.height / 2, -10);
        ctx.lineTo(-boat.height / 2 - 20, -20);
        ctx.lineTo(-boat.height / 2 - 20, 20);
        ctx.lineTo(-boat.height / 2, 10);
        ctx.fill();
    }

    // Hull
    ctx.beginPath();
    ctx.moveTo(boat.height / 2, 0);
    ctx.bezierCurveTo(boat.height / 2, boat.width / 2, boat.height / 4, boat.width / 2, -boat.height / 2, boat.width / 2);
    ctx.lineTo(-boat.height / 2, -boat.width / 2);
    ctx.bezierCurveTo(boat.height / 4, -boat.width / 2, boat.height / 2, -boat.width / 2, boat.height / 2, 0);
    ctx.fillStyle = boatColorPicker?.value || '#828282';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Windshield / Console
    ctx.fillStyle = 'rgba(0, 150, 255, 0.6)';
    ctx.beginPath();
    ctx.moveTo(10, -15);
    ctx.lineTo(15, 0);
    ctx.lineTo(10, 15);
    ctx.lineTo(5, 15);
    ctx.lineTo(0, 0);
    ctx.lineTo(5, -15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1a237e';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Bow Thruster Wash
    if (keys[thrusterConfig.port]) {
        drawPropWash(boat.height / 2 - 10, 0, 1, -Math.PI / 2);
    }
    if (keys[thrusterConfig.stbd]) {
        drawPropWash(boat.height / 2 - 10, 0, 1, Math.PI / 2);
    }


    // Prop Wash Animation
    function drawPropWash(x, y, throttle, customAngle = null) {
        if (Math.abs(throttle) < 0.1) return;
        const offset = (Date.now() / 50) % 10;
        
        ctx.save();
        ctx.translate(x, y);
        if (customAngle !== null) {
            ctx.rotate(customAngle);
        } else if (throttle < 0) {
            ctx.rotate(Math.PI); 
        }
        
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        for(let i=0; i<3; i++) {
            const s = (offset + i * 10) % 30;
            ctx.ellipse(-s - 5, 0, s / 2, s / 4, 0, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
    }

    // Engines
    function drawEngine(ty, throttle) {
        ctx.save();
        ctx.translate(-boat.height / 2, ty);
        ctx.rotate(boat.visualEngineAngle || 0);
        drawPropWash(0, 0, throttle);
        ctx.fillStyle = '#222';
        ctx.fillRect(-8, -5, 12, 10);
        ctx.restore();
    }

    drawEngine(-boat.width / 3, boat.leftThrottle);
    drawEngine(boat.width / 3, boat.rightThrottle);

    ctx.restore(); // boat local
    ctx.restore(); // camera
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

resize();
gameLoop();

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.panel-content').forEach(panel => {
            const parent = panel.parentElement;
            if (parent && !parent.classList.contains('collapsed')) {
                togglePanel(parent.id);
            }
        });
    }
});

document.getElementById('reset-btn').addEventListener('click', () => {
    resetBoat();
});
