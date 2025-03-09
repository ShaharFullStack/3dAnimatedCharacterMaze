import * as THREE from 'https://cdn.skypack.dev/three@0.132.2/build/three.module.js';
import { FBXLoader } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/FBXLoader.js';

// Scene, camera and renderer setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Clock for frame-independent movement
const clock = new THREE.Clock();
// Bubble list for animation
let bubbles = [];

// Enhanced lighting
// Stronger ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Main directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(35, 100, 100);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 1.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
scene.add(directionalLight);

// Fill light to brighten shadows
const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
fillLight.position.set(-10, 10, -10);
scene.add(fillLight);

// Bottom light for shadowed details
const bottomLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
scene.add(bottomLight);

// Simplified textured floor using procedural texture
const floorSize = 800;
const floorResolution = 512;
const floorCanvas = document.createElement('canvas');
floorCanvas.width = floorResolution;
floorCanvas.height = floorResolution;
const floorContext = floorCanvas.getContext('2d');

// Create a wood-like pattern
floorContext.fillStyle = '#a67d53';
floorContext.fillRect(0, 0, floorResolution, floorResolution);

// Add grain lines
floorContext.strokeStyle = '#8b5a2b';
floorContext.lineWidth = 2;
for (let i = 0; i < 40; i++) {
    const x = Math.random() * floorResolution;
    floorContext.beginPath();
    floorContext.moveTo(x, 0);
    floorContext.lineTo(x + Math.random() * 20 - 10, floorResolution);
    floorContext.stroke();
}

// Create a wooden floor texture
const floorTexture = new THREE.CanvasTexture(floorCanvas);
floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(20, 20);

// Create the floor
const groundGeometry = new THREE.PlaneGeometry(floorSize, floorSize, 100, 100);
const groundMaterial = new THREE.MeshStandardMaterial({
    map: floorTexture,
    roughness: 0.8,
    metalness: 0.2
});

// Create floor mesh
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.set(0, 0, 0);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Improve floor surface with small polygon displacements
const positionAttribute = ground.geometry.attributes.position;
for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i);
    const y = positionAttribute.getY(i);
    const z = positionAttribute.getZ(i);

    // Add small hills to the floor in certain parts
    if (Math.abs(x) > 300 || Math.abs(y) > 300) {
        const height = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 1.5;
        positionAttribute.setZ(i, z + height);
    }
}
positionAttribute.needsUpdate = true;
ground.geometry.computeVertexNormals();

// Subtle white grid above the ground
const gridHelper = new THREE.GridHelper(floorSize, 80, 0x555555, 0x888888);
gridHelper.position.set(300, 0.05, 0);
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.2;
scene.add(gridHelper);

// Sky background with gradient
const skyGeometry = new THREE.SphereGeometry(750, 32, 32);
const skyUniforms = {
    minY: { value: 0 },
    maxY: { value: 750 },
    colorBottom: { value: new THREE.Color("#ADD8E6") },
    colorTop: { value: new THREE.Color("#000080") }
};
const skyMaterial = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: `
        varying float vY;
        void main() {
            vY = position.y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying float vY;
        uniform float minY;
        uniform float maxY;
        uniform vec3 colorBottom;
        uniform vec3 colorTop;
        void main() {
            float t = (vY - minY) / (maxY - minY);
            t = clamp(t, 0.0, 1.0);
            vec3 color = mix(colorBottom, colorTop, t);
            gl_FragColor = vec4(color, 1.0);
        }
    `,
    side: THREE.BackSide
});
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
scene.add(sky);

// Create procedural textures for walls and doors
// Wall texture
const wallCanvas = document.createElement('canvas');
wallCanvas.width = 256;
wallCanvas.height = 256;
const wallContext = wallCanvas.getContext('2d');

const textureLoader = new THREE.TextureLoader();

// Create base color
wallContext.fillStyle = '#8b7d6b';
wallContext.fillRect(0, 0, 256, 256);

// Add brick pattern
wallContext.fillStyle = '#9e8b7b';
for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 64) {
        const offset = (y % 64 === 0) ? 0 : 32;
        wallContext.fillRect(x + offset, y, 28, 28);
    }
}

const wallTexture = new THREE.CanvasTexture(wallCanvas);
wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
const doorTexture = textureLoader.load('./textures/door_color.png');
doorTexture.wrapS = doorTexture.wrapT = THREE.RepeatWrapping;
// Door texture
const doorCanvas = document.createElement('canvas');
doorCanvas.width = 256;
doorCanvas.height = 256;
const doorContext = doorCanvas.getContext('2d');

// Door base color
doorContext.fillStyle = doorTexture;
doorContext.fillRect(0, 0, 256, 256);

// Door panels
doorContext.fillStyle = doorTexture;
doorContext.fillRect(20, 20, 216, 100);
doorContext.fillRect(20, 136, 216, 100);

// Door handle
doorContext.fillStyle = '#c0c0c0';
doorContext.beginPath();
doorContext.arc(200, 128, 10, 0, Math.PI * 2);
doorContext.fill();

// Materials for walls and doors
const wallMaterial = new THREE.MeshStandardMaterial({
    map: wallTexture,
    roughness: 0.9,
    metalness: 0.1
});

const doorMaterial = new THREE.MeshStandardMaterial({
    map: doorTexture,
    displacementScale: 0.1,
    roughness: 0.5,
    metalness: 0.6,
    color: 0xffffff 
});

// Button colors array
const buttonColors = [
    0xff0000, // red
    0x00ff00, // green
    0x0000ff, // blue
    0xffff00, // yellow
    0xff00ff, // purple
    0x00ffff  // turquoise
];

// Function to create walls
function createWall(x1, z1, x2, z2, y = 2.5, height = 5) {
    const width = Math.abs(x2 - x1);
    const depth = Math.abs(z2 - z1 + 0.4);

    // Create more complex geometry with additional divisions for textures
    const segmentsX = Math.max(1, Math.floor(width / 10));
    const segmentsY = Math.max(1, Math.floor(height / 2));
    const segmentsZ = Math.max(1, Math.floor(depth / 10));

    const geometry = new THREE.BoxGeometry(
        width, height, depth,
        segmentsX, segmentsY, segmentsZ
    );

    // Adjust texture dimensions to wall size
    const clonedMaterial = wallMaterial.clone();

    // Adjust texture to wall size
    if (clonedMaterial.map) {
        clonedMaterial.map = wallTexture.clone();
        clonedMaterial.map.wrapS = clonedMaterial.map.wrapT = THREE.RepeatWrapping;
        clonedMaterial.map.repeat.set(width / 5, height / 2.5);
        clonedMaterial.needsUpdate = true;
    }

    // Create the wall with the adjusted material
    const wall = new THREE.Mesh(geometry, clonedMaterial);
    wall.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
    wall.castShadow = true;
    wall.receiveShadow = true;

    // Add decorative elements to long walls
    if (width > 20 || depth > 20) {
        addWallDecorations(wall, width, height, depth);
    }

    scene.add(wall);
    return wall;
}

// Function to add decorations to walls
function addWallDecorations(wall, width, height, depth) {
    // Check if it's a horizontal or vertical wall
    const isHorizontalWall = width > depth;

    // Add wall decorations
    if (isHorizontalWall) {
        // Decorations for horizontal wall
        const numDecorations = Math.floor(width / 30);

        for (let i = 0; i < numDecorations; i++) {
            // Decorative pillar
            const pillarGeometry = new THREE.BoxGeometry(2, height + 1, 2);
            const pillarMaterial = new THREE.MeshStandardMaterial({
                color: 0x888888,
                roughness: 0.7,
                metalness: 0.3
            });

            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);

            // Position the pillar along the wall
            const xOffset = (i + 1) * (width / (numDecorations + 1)) - width / 2;
            pillar.position.set(xOffset, 0.5, 0);

            // Add the pillar as a child of the wall
            wall.add(pillar);
        }
    } else {
        // Decorations for vertical wall
        const numDecorations = Math.floor(depth / 30);

        for (let i = 0; i < numDecorations; i++) {
            // Decorative pillar
            const pillarGeometry = new THREE.BoxGeometry(2, height + 1, 2);
            const pillarMaterial = new THREE.MeshStandardMaterial({
                color: 0x888888,
                roughness: 0.7,
                metalness: 0.3
            });

            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);

            // Position the pillar along the wall
            const zOffset = (i + 1) * (depth / (numDecorations + 1)) - depth / 2;
            pillar.position.set(0, 0.5, zOffset);

            // Add the pillar as a child of the wall
            wall.add(pillar);
        }
    }
}

// Function to create an enhanced door
function createDoor(x, y, z, rotation = 0) {
    // Create a group for the door object
    const doorGroup = new THREE.Group();
    doorGroup.position.set(x, y, z);
    doorGroup.rotation.y = rotation;

    // Door frame
    const doorFrameGeometry = new THREE.BoxGeometry(1.5, 6, 11);
    const doorFrameMaterial = new THREE.MeshStandardMaterial({
        color: 0x5c4033,
        roughness: 0.9,
        metalness: 0.1
    });

    const doorFrame = new THREE.Mesh(doorFrameGeometry, doorFrameMaterial);
    doorFrame.castShadow = true;
    doorFrame.receiveShadow = true;
    doorGroup.add(doorFrame);

    // The door itself (smaller than the frame)
    const doorGeometry = new THREE.BoxGeometry(0.5, 5, 10);

    // Create an array of different materials for different sides of the door
    const doorSideMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a2a1a,
        roughness: 0.7,
        metalness: 0.3
    });

    // Door center with texture
    const doorFrontMaterial = doorMaterial.clone();
    const doorBackMaterial = doorMaterial.clone();

    // Material array by face order: x+, x-, y+, y-, z+, z-
    const doorMaterials = [
        doorSideMaterial, doorSideMaterial,  // sides
        doorSideMaterial, doorSideMaterial,  // top and bottom
        doorFrontMaterial, doorBackMaterial  // front and back
    ];

    const door = new THREE.Mesh(doorGeometry, doorMaterials);
    door.position.set(0.4, 0, 0); // Slight forward offset relative to the frame
    door.castShadow = true;
    door.receiveShadow = true;

    // Add a handle to the door
    const handleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8);
    const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0xc0c0c0,
        roughness: 0.2,
        metalness: 0.8
    });

    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0.4, 0, 3); // Handle position
    door.add(handle);

    doorGroup.add(door);
    doorGroup.door = door; // Store a reference to the door itself in the group

    scene.add(doorGroup);
    return doorGroup;
}

// Function to create a button
function createButton(x, y, z, colorIndex, connectedDoor = null) {
    const buttonGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.2);
    const buttonMaterial = new THREE.MeshStandardMaterial({
        color: buttonColors[colorIndex],
        emissive: buttonColors[colorIndex],
        emissiveIntensity: 0.5
    });
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button.position.set(x, y, z);
    button.castShadow = true;
    button.receiveShadow = true;
    button.userData.colorIndex = colorIndex;
    button.userData.connectedDoor = connectedDoor;
    button.userData.isPressed = false;
    button.userData.isButton = true; // Add identification that the object is a button
    scene.add(button);
    return button;
}

// Extended maze structure
// Room 1 - Starting room
const room1West = createWall(-50, -50, -50, 50);
const room1EastLeft = createWall(50, -50, 50, -5);
const room1EastRight = createWall(50, 5, 50, 50);
const room1South = createWall(-50, -50, 50, -50);
const room1North = createWall(-50, 50, 50, 50);

// Corridor 1
const corridor1South = createWall(50, -5, 150, -5);
const corridor1North = createWall(50, 5, 150, 5);

// Room 2 - Junction
const room2WestLeft = createWall(150, -50, 150, -5);
const room2WestRight = createWall(150, 5, 150, 50);
const room2EastLeft = createWall(250, -50, 250, -5);
const room2EastRight = createWall(250, 5, 250, 50);
const room2South = createWall(150, -50, 250, -50);
const room2North = createWall(150, 50, 250, 50);

// Corridor 2 - Straight
const corridor2South = createWall(250, -5, 350, -5);
const corridor2North = createWall(250, 5, 350, 5);

// Corridor 3 - North
const corridor3West = createWall(195, 50, 195, 150);
const corridor3East = createWall(205, 50, 205, 150);

// Corridor 4 - South
const corridor4West = createWall(195, -50, 195, -150);
const corridor4East = createWall(205, -50, 205, -150);

// Room 3 - Straight
const room3WestLeft = createWall(350, -50, 350, -5);
const room3WestRight = createWall(350, 5, 350, 50);
const room3East = createWall(450, -50, 450, 50);
const room3South = createWall(350, -50, 450, -50);
const room3North = createWall(350, 50, 450, 50);

// Room 4 - North
const room4West = createWall(150, 150, 150, 250);
const room4East = createWall(250, 150, 250, 250);
const room4South = createWall(150, 150, 250, 150);
const room4North = createWall(150, 250, 250, 250);

// Room 5 - South
const room5West = createWall(150, -250, 150, -150);
const room5East = createWall(250, -250, 250, -150);
const room5South = createWall(150, -250, 250, -250);
const room5North = createWall(150, -150, 250, -150);

// Corridor 5 - To final room
const corridor5South = createWall(450, -5, 550, -5);
const corridor5North = createWall(450, 5, 550, 5);

// Final room - Jacuzzi
const finalRoomWest = createWall(550, -50, 550, 50);
const finalRoomEast = createWall(650, -50, 650, 50);
const finalRoomSouth = createWall(550, -50, 650, -50);
const finalRoomNorth = createWall(550, 50, 650, 50);

// Create doors
const door1 = createDoor(50, 1, 0);  // Door from room 1 to corridor 1
const door2 = createDoor(200, 1, -50, Math.PI / 2);  // Door to south room
const door3 = createDoor(200, 1, 50, Math.PI / 2);  // Door to north room
const door4 = createDoor(250, 1, 0);  // Door from room 2 to corridor 2
const door5 = createDoor(450, 1, 0);  // Door from room 3 to corridor 5
const door6 = createDoor(550, 1, 0);  // Door to final room

// Create buttons
const button1 = createButton(0, 1.5, -49, 0, door1);  // Button for door 1 - red
const button2 = createButton(0, 1.5, 49, 1, door2);  // Button for door 2 - green
const button3 = createButton(200, 1.5, 100, 2, door3);  // Button for door 3 - blue
const button4 = createButton(300, 1.5, 49.5, 3, door4);  // Button for door 4 - yellow
const button5 = createButton(400, 1.5, -49.5, 4, door5);  // Button for door 5 - purple
const button6 = createButton(500, 1.5, 49.5, 5, door6);  // Button for door 6 - turquoise
button1.userData.action = () => {
    doorStates.door1 = !doorStates.door1; // Change door 1 state
};
button2.userData.action = () => {
    doorStates.door2 = !doorStates.door2; // Change door 2 state
};
button3.userData.action = () => {
    doorStates.door3 = !doorStates.door3; // Change door 3 state
};
button4.userData.action = () => {
    doorStates.door4 = !doorStates.door4; // Change door 4 state
};
button5.userData.action = () => {
    doorStates.door5 = !doorStates.door5; // Change door 5 state
};
button6.userData.action = () => {
    doorStates.door6 = !doorStates.door6; // Change door 6 state
};
// Add objects to the final room
function createJacuzzi() {
    const jacuzziGeometry = new THREE.CylinderGeometry(10, 10, 3, 32);
    const jacuzziMaterial = new THREE.MeshStandardMaterial({
        color: 0x00bfff,
        roughness: 0.2,
        metalness: 0.8,
        transparent: true,
        opacity: 0.8
    });
    const jacuzzi = new THREE.Mesh(jacuzziGeometry, jacuzziMaterial);
    jacuzzi.position.set(600, 1.5, 0);
    jacuzzi.castShadow = true;
    jacuzzi.receiveShadow = true;
    scene.add(jacuzzi);

    // Bubbling water
    const waterGeometry = new THREE.CylinderGeometry(9.5, 9.5, 0.5, 32);
    const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        roughness: 0.1,
        metalness: 0.3,
        transparent: true,
        opacity: 0.6
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.position.set(600, 2.8, 0);
    scene.add(water);

    // Bubbles
    for (let i = 0; i < 20; i++) {
        const bubbleGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const bubbleMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7
        });
        const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 8;
        bubble.position.set(
            600 + Math.cos(angle) * radius,
            2.8,
            Math.sin(angle) * radius
        );
        bubble.userData.floatSpeed = 0.5 + Math.random() * 0.5;
        bubble.userData.angle = angle;
        bubble.userData.radius = radius;
        scene.add(bubble);

        // Animation for bubbles
        bubbles.push(bubble);
    }

    return jacuzzi;
}

function createSofa(x, z, rotation) {
    const baseGeometry = new THREE.BoxGeometry(8, 1, 3);
    const backGeometry = new THREE.BoxGeometry(8, 3, 1);
    const armGeometry = new THREE.BoxGeometry(1, 2, 3);

    const sofaMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.9,
        metalness: 0.1
    });

    const cushionMaterial = new THREE.MeshStandardMaterial({
        color: 0xA0522D,
        roughness: 0.8,
        metalness: 0.1
    });

    const sofaGroup = new THREE.Group();

    // Sofa base
    const base = new THREE.Mesh(baseGeometry, sofaMaterial);
    base.position.set(0, 0.5, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    sofaGroup.add(base);

    // Backrest
    const back = new THREE.Mesh(backGeometry, cushionMaterial);
    back.position.set(0, 2, -1.5);
    back.castShadow = true;
    back.receiveShadow = true;
    sofaGroup.add(back);

    // Left armrest
    const leftArm = new THREE.Mesh(armGeometry, sofaMaterial);
    leftArm.position.set(-3.5, 1.5, 0);
    leftArm.castShadow = true;
    leftArm.receiveShadow = true;
    sofaGroup.add(leftArm);

    // Right armrest
    const rightArm = new THREE.Mesh(armGeometry, sofaMaterial);
    rightArm.position.set(3.5, 1.5, 0);
    rightArm.castShadow = true;
    rightArm.receiveShadow = true;
    sofaGroup.add(rightArm);

    sofaGroup.position.set(x, 1, z);
    sofaGroup.rotation.y = rotation;
    scene.add(sofaGroup);

    return sofaGroup;
}

// Create furniture in the final room
const jacuzzi = createJacuzzi();
const sofa1 = createSofa(585, -30, 0);
const sofa2 = createSofa(615, -30, 0);
const sofa3 = createSofa(585, 30, Math.PI);
const sofa4 = createSofa(615, 30, Math.PI);

// List of walls and doors for collision detection
const walls = [
    room1West, room1EastLeft, room1EastRight, room1South, room1North,
    corridor1South, corridor1North,
    room2WestLeft, room2WestRight, room2EastLeft, room2EastRight, room2South, room2North,
    corridor2South, corridor2North,
    corridor3West, corridor3East,
    corridor4West, corridor4East,
    room3WestLeft, room3WestRight, room3East, room3South, room3North,
    room4West, room4East, room4South, room4North,
    room5West, room5East, room5South, room5North,
    corridor5South, corridor5North,
    finalRoomWest, finalRoomEast, finalRoomSouth, finalRoomNorth,
    door1, door2, door3, door4, door5, door6
];

// List of buttons
const buttons = [button1, button2, button3, button4, button5, button6];

// Variables for character and animations
let mixer;
let person;
let animations = {};

// Load character and animations
const fbxLoader = new FBXLoader();
fbxLoader.load('./animations/Idle.fbx', (idleFbx) => {
    person = idleFbx;
    person.scale.set(0.025, 0.025, 0.025);
    person.position.set(0, 0, 0);
    scene.add(person);

    // Spotlight that follows the character
    const spotLight = new THREE.SpotLight(0xffffff, 0.9);
    spotLight.position.set(0, 0, 0);
    spotLight.angle = Math.PI / 3;
    spotLight.penumbra = 0.8;
    spotLight.decay = 10;
    spotLight.distance = 1000;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.camera.near = 0;
    spotLight.shadow.camera.far = 400;
    scene.add(spotLight);

    // Add target for spotlight
    const spotLightTarget = new THREE.Object3D();
    spotLightTarget.position.set(0, 4, 5);
    scene.add(spotLightTarget);
    spotLight.target = spotLightTarget;

    // Update light position based on character position
    function updateSpotLight() {
        spotLight.position.x = person.position.x + 10;
        spotLight.position.z = person.position.z + 10;
        spotLight.position.y = person.position.y - 1;
        spotLight.target.position.copy(person.position);
        spotLight.target.updateMatrixWorld();
        requestAnimationFrame(updateSpotLight);
    }
    updateSpotLight();

    // הגדרת מיקסר לאנימציות
    mixer = new THREE.AnimationMixer(person);

    // הוספת אנימציית Idle
    if (idleFbx.animations && idleFbx.animations.length > 0) {
        animations['Idle'] = mixer.clipAction(idleFbx.animations[0]);
        animations['Idle'].play();
        console.log('שם אנימציה (Idle):', idleFbx.animations[0].name);
    } else {
        console.warn('לא נמצאה אנימציית Idle במודל Idle.fbx');
    }

    // טעינת אנימציית Walk
    fbxLoader.load('./animations/Walk.fbx', (walkFbx) => {
        if (walkFbx.animations && walkFbx.animations.length > 0) {
            animations['Walk'] = mixer.clipAction(walkFbx.animations[0]);
            console.log('שם אנימציה (Walk):', walkFbx.animations[0].name);
        } else {
            console.warn('לא נמצאה אנימציית Walk בקובץ Walk.fbx');
        }
    });

    fbxLoader.load('./animations/Crouching.fbx', (crouchFbx) => {
        if (crouchFbx.animations && crouchFbx.animations.length) {
            animations['Crouch'] = mixer.clipAction(crouchFbx.animations[0]);
            console.log('שם אנימציה (Crouch):', crouchFbx.animations[0].name);
        } else {
            console.warn('לא נמצאה אנימציית Crouch בקובץ Crouch.fbx');
        }
    });

    // טעינת אנימציית Jump
    fbxLoader.load('./animations/Jumping.fbx', (jumpFbx) => {
        if (jumpFbx.animations && jumpFbx.animations.length > 0) {
            animations['Jump'] = mixer.clipAction(jumpFbx.animations[0]);
            console.log('שם אנימציה (Jump):', jumpFbx.animations[0].name);
        } else {
            console.warn('לא נמצאה אנימציית Jump בקובץ Jumping.fbx');
        }
    });
});

// תיבת התנגשות לדמות
const personCollisionBox = new THREE.Box3();

// הגדרת המצלמה ובקרותיה
let isLocked = false;
let cameraYaw = 0;
let cameraPitch = 0;
let zoomFactor = 0.5;
const minZoom = 0.45;
const maxZoom = 4;
const defaultOffset = new THREE.Vector3(0, 10, 0);

renderer.domElement.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === renderer.domElement;
});

document.addEventListener('mousemove', (event) => {
    if (isLocked) {
        const deltaX = event.movementX || 0;
        const deltaY = event.movementY || 0;
        const sensitivity = 0.005;
        cameraYaw -= deltaX * sensitivity;
        cameraPitch += deltaY * sensitivity;
        const maxPitch = Math.PI / 2.2;
        cameraPitch = Math.max(-maxPitch, Math.min(maxPitch, cameraPitch));
    }
});

document.addEventListener('wheel', (event) => {
    const zoomSensitivity = 0.001;
    zoomFactor += event.deltaY * zoomSensitivity;
    zoomFactor = Math.max(minZoom, Math.min(maxZoom, zoomFactor));
});

// בקרות מקלדת
const keys = { w: false, a: false, s: false, d: false, " ": false, z: false, e: false };
window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key in keys) keys[key] = true;
});
window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key in keys) keys[key] = false;
});
// פונקציה לבדיקת אינטראקציה עם כפתורים
function checkButtonInteraction() {
    // מרחק מינימלי לאינטראקציה עם כפתור
    const interactionDistance = 3.5;
    
    // עבור על כל הכפתורים בסצנה
    scene.children.forEach(object => {
        // בדיקה אם האובייקט הוא כפתור (לפי שם או תכונה מיוחדת)
        if (object.userData && object.userData.isButton) {
            // חישוב המרחק בין השחקן לכפתור
            const distance = person.position.distanceTo(object.position);
            
            // אם השחקן קרוב מספיק לכפתור
            if (distance < interactionDistance) {
                // הפעלת הכפתור
                activateButton(object);
            }
        }
    });
}

// פונקציה להפעלת כפתור
function activateButton(button) {
    if (button.userData.isPressed) return; // מניעת הפעלה חוזרת
    button.userData.isPressed = true;

    if (button.material) {
        if (!button.userData.originalColor) {
            button.userData.originalColor = button.material.color.clone();
        }
        button.material.color.set(0x00ff00); // צבע צהוב להדגשה

        setTimeout(() => {
            button.material.color.copy(button.userData.originalColor);
            if (button.userData.action && typeof button.userData.action === 'function') {
                button.userData.action();
            }
            button.userData.isPressed = false; // איפוס לאחר חצי שנייה
        }, 500);
    }
}


// משתנים לתנועת הדמות
const moveSpeed = 10;
let walking = false;
let verticalVelocity = 0;
let isOnGround = true;
const jumpStrength = 5.6;
const gravity = 20.9;
let personHeight = 1.8;
const crouchHeight = 1.2;

// מצב הדלתות
const doorStates = {
    door1: false,
    door2: false,
    door3: false,
    door4: false,
    door5: false,
    door6: false
};

// עדכון אנימציית הבועות
function updateBubbles(delta) {
    for (const bubble of bubbles) {
        // העלאת הבועה
        bubble.position.y += bubble.userData.floatSpeed * delta;

        // הזזה קלה בצירי X ו-Z
        const wobble = Math.sin(clock.getElapsedTime() * 2 + bubble.userData.angle) * 0.05;
        bubble.position.x = 600 + Math.cos(bubble.userData.angle) * (bubble.userData.radius + wobble);
        bubble.position.z = Math.sin(bubble.userData.angle) * (bubble.userData.radius + wobble);

        // איפוס מיקום כשהבועה יוצאת מהמים
        if (bubble.position.y > 5) {
            bubble.position.y = 2.8;
            bubble.userData.angle = Math.random() * Math.PI * 2;
            bubble.userData.radius = Math.random() * 8;
            bubble.position.x = 600 + Math.cos(bubble.userData.angle) * bubble.userData.radius;
            bubble.position.z = Math.sin(bubble.userData.angle) * bubble.userData.radius;
        }
    }
}

// עדכון המצלמה
function updateCamera() {
    if (!person) return;
    const cameraRotation = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(cameraPitch, cameraYaw, 0, 'YXZ')
    );
    const offset = defaultOffset.clone().applyQuaternion(cameraRotation);
    offset.multiplyScalar(zoomFactor);
    camera.position.copy(person.position).add(offset);
    const targetPosition = person.position.clone();
    targetPosition.y += personHeight * 0.8;
    camera.lookAt(targetPosition);
    person.rotation.y = cameraYaw;
}

// עדכון מצב הדלתות
function updateDoors(delta) {
    const doorSpeed = 3 * delta;

    for (let i = 1; i <= 6; i++) {
        const doorGroup = eval('door' + i); // הקבוצה של הדלת
        const door = doorGroup.door; // הדלת עצמה בתוך הקבוצה
        const isOpen = doorStates['door' + i];

        if (isOpen && door.position.y < 7.5) {
            door.position.y += doorSpeed;
            if (door.position.y > 7.5) door.position.y = 7.5;
        } else if (!isOpen && door.position.y > 2.5) {
            door.position.y -= doorSpeed;
            if (door.position.y < 2.5) door.position.y = 2.5;
        }
    }
}
// עדכון תנועת הדמות
function updatePerson(delta) {
    if (!person) return;

    walking = false;
    const prevPosition = person.position.clone();

    // תנועה לפי לחיצות מקלדת
    if (keys.w) {
        const forward = new THREE.Vector3(0, 0, 4).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
        person.position.add(forward.multiplyScalar(moveSpeed * delta));
        walking = true;
    }
    if (keys.s) {
        const backward = new THREE.Vector3(0, 0, -4).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
        person.position.add(backward.multiplyScalar(moveSpeed * delta));
        walking = true;
    }
    if (keys.a) {
        const left = new THREE.Vector3(4, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
        person.position.add(left.multiplyScalar(moveSpeed * delta));
        walking = true;
    }
    if (keys.d) {
        const right = new THREE.Vector3(-4, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
        person.position.add(right.multiplyScalar(moveSpeed * delta));
        walking = true;
    }

    // הפעלה של מקש 'e' לאינטראקציה עם כפתורים
    if (keys.e) {
        checkButtonInteraction();
    }

    // קפיצה
    if (keys[" "] && isOnGround) {
        // התחלת אנימציית הקפיצה מיד
        if (animations['Jump']) {
            animations['Jump'].play();
            if (animations['Idle']) animations['Idle'].stop();
            if (animations['Walk']) animations['Walk'].stop();
        }
        isOnGround = false;
        verticalVelocity = jumpStrength + 4;
    }

    // כריעה
    if (keys.z) {
        personHeight = crouchHeight;
        if (animations['Crouch']) {
            animations['Crouch'].play();
            if (animations['Idle']) animations['Idle'].stop();
            if (animations['Walk']) animations['Walk'].stop();
        }
    } else {
        personHeight = 1.8;
    }

    // כוח המשיכה
    verticalVelocity -= gravity * delta;
    person.position.y += verticalVelocity * delta;
    if (person.position.y <= 0) {
        person.position.y = 0;
        verticalVelocity = 0;
        isOnGround = true;
        if (animations['Jump']) animations['Jump'].stop();
        // חזרה לאנימציה המתאימה
        if (walking) {
            if (animations['Walk']) animations['Walk'].play();
        } else {
            if (animations['Idle']) animations['Idle'].play();
        }
    }

    // עדכון תיבת ההתנגשות
    personCollisionBox.setFromObject(person);

    // בדיקת התנגשות עם קירות ודלתות סגורות
    let collision = false;
    for (const wall of walls) {
        // בדיקה אם הקיר הוא דלת פתוחה
        const doorIndex = [door1, door2, door3, door4, door5, door6].indexOf(wall);
        if (doorIndex !== -1 && doorStates['door' + (doorIndex + 1)]) {
            continue; // דלג על בדיקת התנגשות עם דלת פתוחה
        }
        wall.updateWorldMatrix(true, false);
        const wallBB = new THREE.Box3().setFromObject(wall);
        if (personCollisionBox.intersectsBox(wallBB)) {
            collision = true;
            break;
        }
    }
    if (collision) {
        person.position.copy(prevPosition);
        walking = false;
    }

    // ניהול אנימציות
    if (!isOnGround) {
        if (animations['Jump']) {
            animations['Jump'].play();
            if (animations['Idle']) animations['Idle'].stop();
            if (animations['Walk']) animations['Walk'].stop();
            if (animations['Crouch']) animations['Crouch'].stop();
        }
    } else if (walking) {
        if (animations['Walk']) {
            animations['Walk'].play();
            if (animations['Idle']) animations['Idle'].stop();
            if (animations['Jump']) animations['Jump'].stop();
            if (animations['Crouch']) animations['Crouch'].stop();
        }
    } else if (animations['Idle']) {
        animations['Idle'].play();
        if (animations['Walk']) animations['Walk'].stop();
        if (animations['Jump']) animations['Jump'].stop();
        if (animations['Crouch']) animations['Crouch'].stop();
    } else {
        if (animations['Crouch']) {
            animations['Crouch'].play();
            if (animations['Idle']) animations['Idle'].stop();
            if (animations['Jump']) animations['Jump'].stop();
            if (animations['Walk']) animations['Walk'].stop();
        }
    }
}


// לולאת אנימציה
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    updateBubbles(delta);
    // checkButtonPress();
    updateDoors(delta);
    updatePerson(delta);
    updateCamera();
    renderer.render(scene, camera);
}
animate();

// טיפול בשינוי גודל החלון
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});