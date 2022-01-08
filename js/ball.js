// Vytvorte jednoduchú 3D hru, v ktorej hráč môže hodiť
// danú loptu vybranou silou vo vybranom smere a
// pozorovať jej skákanie. Implementujte aspoň tri
// miestnosti (levely). Pri implementácii použite zákony fyziky.

import {GUI} from './datGUI/dat.gui.module.js'
//AmmoJS variables
let physicsWorld, rigidBodies = [], tmpTrans = null
let ammoTmpPos = null, ammoTmpQuat = null;
let kMoveDirection = {left: 0, right: 0, forward: 0, back: 0}, tmpPos = new THREE.Vector3();
let tmpQuat = new THREE.Quaternion();
const STATE = {DISABLE_DEACTIVATION: 4}
const FLAGS = { CF_KINEMATIC_OBJECT: 2 }

//Default camera position
let startRoomIndex = 0;

//Threejs variables
let controls;
let container = [];
let scene, camera, renderer, clock;

//Ball shooting variables
let mouseCoords = new THREE.Vector2(), raycaster = new THREE.Raycaster();
let ballObject = null, moveDirection = {left: 0, right: 0, forward: 0, back: 0}

//Room 1 Variables (index = 0)
let PosIndex1 = [300,0];
let room1MovingBox = [null,null,null];
let curve = [null,null];
let room1Filled = false;

//Room 2 Variables (index = 1)
let box = null;
let room2Filled = false;

//Room 3 Variables (index = 2)
let room3MovingBox = [null,null,null,null];
let blockPlane = [];
let PosIndex3 = [-95,-57,-19,18];
let movementDir = [1,1,1,1];
let staticObject = [null,null,null,null,null,null,null,null,null,null];
let room3Filled;

//GUI variables
let level = 'Room 1';
var guiControls = new function() {
    this.throwingForce = 400;
    this.movementSpeed = 1;
    this.bounceFactor = 0.9;
    this.mass = 0.8;
    this.toggle = true;
    this.size = 10;
    this.boxMass = 2;
    this.resetGame = function (){
        location.reload();
    }
}


//Room parameters
var room = new function() {
    this.scale = 800;
    this.roomOffsetX = [-3000,0,3000]
    this.boxWallOffsetZ = -40;
    this.boxWallOffsetX = -40
}

//Ammojs Initialization
Ammo().then(start)

//This function initializes game world
function start() {

    tmpTrans = new Ammo.btTransform();
    ammoTmpPos = new Ammo.btVector3();
    ammoTmpQuat = new Ammo.btQuaternion();

    setupPhysicsWorld();
    setupGraphics();
    createRoomFloor(0);
    createRoomFloor(-1);
    createRoomFloor(-2);
    createRoomFloor(-3);
    createRoomWalls();
    fillRoom1();
    setupEventHandlers();
    renderFrame();
    setupGui()

}

//Function for setting ammo.js physics parameters such as solver, gravity and more.
function setupPhysicsWorld() {

    let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration),
        overlappingPairCache = new Ammo.btDbvtBroadphase(),
        solver = new Ammo.btSequentialImpulseConstraintSolver();

    physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    physicsWorld.setGravity(new Ammo.btVector3(0, -380, 0));

}
//Setup for renderer, camera, lighting, and controls.
function setupGraphics() {

    //create clock for timing
    clock = new THREE.Clock();

    //create the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101010);
    const light = new THREE.AmbientLight( 0x404040 )
    scene.add( light );
    //create camera
    camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.2, 5000);
    camera.position.set(room.roomOffsetX[startRoomIndex], 100, 380);
    camera.lookAt(new THREE.Vector3(room.roomOffsetX[startRoomIndex], 300, 0));

    for(let i = 0; i < 3; i++){
        const pointLight = new THREE.PointLight( 0xffffff, 1, 10000 );
        pointLight.position.set( room.roomOffsetX[i], 600, 70 );
        scene.add( pointLight );

        const sphereSize = 10;
        const pointLightHelper = new THREE.PointLightHelper( pointLight, sphereSize );
        //scene.add( pointLightHelper );
        pointLight.castShadow = true;
        pointLight.shadow.mapSize.width = 4096;
        pointLight.shadow.mapSize.height = 2048;
        pointLight.shadow.camera.far = 2000;
    }

    renderer = new THREE.WebGLRenderer({antialias: false});
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    //controls = new THREE.FirstPersonControls( camera, renderer.domElement);
    //
    // controls.movementSpeed = 1000;
    // controls.domElement = renderer.domElement;
    // controls.rollSpeed = Math.PI / 24;
    // controls.autoForward = false;
    // controls.dragToLook = false;
    controls.target = new THREE.Vector3(room.roomOffsetX[1], 50, 0)
    renderer.setClearColor(0xbfd1e5);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    renderer.gammaInput = true;
    renderer.gammaOutput = true;

    renderer.shadowMap.enabled = true;
    controls.target = new THREE.Vector3(room.roomOffsetX[startRoomIndex], 0, 0)
}

//Besides rendering frame, this function also updates position of moving objects.
function renderFrame() {

    let deltaTime = clock.getDelta();

    moveRoom1Cube(0);
    moveRoom1Cube(1);
    rotateRoom1Wall(2);

    if(room3Filled){
        moveRoom3Cube(0);
        moveRoom3Cube(1);
        moveRoom3Cube(2);
        moveRoom3Cube(3);
    }


    updateScene(deltaTime);

    renderer.render(scene, camera);

    requestAnimationFrame(renderFrame);

}

//Setup for keyboard and mouse event listeners.
function setupEventHandlers() {

    window.addEventListener('keydown', handleKeyDown, false);
    window.addEventListener('mousemove', handleMouseMove, false);

}

//Stores mouse coordinates for shooting ball.
function handleMouseMove(event) {
    mouseCoords.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );
}

//shootBall() is called when space is pressed.
function handleKeyDown(event) {

    let keyCode = event.keyCode;

    switch (keyCode) {
        case 32: //SPACE: SHOOT BALL
            shootBall();
            break;
    }
}

//This function propels ball in direction of vector pointing from camera to mouse coordinates.
function shootBall() {

    raycaster.setFromCamera(mouseCoords, camera);
    tmpPos.copy(raycaster.ray.direction);
    tmpPos.add(raycaster.ray.origin);

    let pos = {x: tmpPos.x, y: tmpPos.y, z: tmpPos.z};
    let radius = guiControls.size;
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = guiControls.mass;

    //threeJS Section
    let ball = new THREE.Mesh(new THREE.SphereBufferGeometry(radius,15,15), new THREE.MeshPhongMaterial({color: '#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0')}));

    ball.position.set(pos.x, pos.y, pos.z);

    ball.castShadow = true;
    ball.receiveShadow = true;

    scene.add(ball);

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btSphereShape(radius);
    // colShape.setMargin(0.1);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
    let body = new Ammo.btRigidBody(rbInfo);

    physicsWorld.addRigidBody(body);

    tmpPos.copy(raycaster.ray.direction);
    tmpPos.multiplyScalar(guiControls.throwingForce);

    body.setLinearVelocity(new Ammo.btVector3(tmpPos.x, tmpPos.y, tmpPos.z));
    body.setRestitution(guiControls.bounceFactor)

    ball.userData.physicsBody = body;
    rigidBodies.push(ball);

}

//Moves and rotates three.js object together with ammo.js physical properties along vector path, created in createPaths.
function moveRoom1Cube(cubeIndex){
    let scalingFactor = 0.3;

    let moveX =  kMoveDirection.right - kMoveDirection.left;
    let moveZ =  kMoveDirection.back - kMoveDirection.forward;
    let moveY =  0;


    let translateFactor = tmpPos.set(moveX, moveY, moveZ);
    translateFactor.multiplyScalar(scalingFactor);
    room1MovingBox[cubeIndex].translateX(translateFactor.x);
    room1MovingBox[cubeIndex].translateY(translateFactor.y);
    room1MovingBox[cubeIndex].translateZ(translateFactor.z);
    room1MovingBox[cubeIndex].getWorldPosition(tmpPos);
    room1MovingBox[cubeIndex].getWorldQuaternion(tmpQuat);

    let physicsBody = room1MovingBox[cubeIndex].userData.physicsBody;

    let ms = physicsBody.getMotionState();

    if ( ms ) {
        ammoTmpPos.setValue(tmpPos.x, tmpPos.y, tmpPos.z);
        ammoTmpQuat.setValue(tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w);
        tmpTrans.setIdentity();
        tmpTrans.setOrigin(ammoTmpPos);
        tmpTrans.setRotation(ammoTmpQuat);
        ms.setWorldTransform(tmpTrans);
    }

    PosIndex1[cubeIndex] = PosIndex1[cubeIndex]+guiControls.movementSpeed;
    if (PosIndex1[cubeIndex] > 1000) { PosIndex1[cubeIndex] = 0;}
    var camPos = curve[cubeIndex].getPoint(PosIndex1[cubeIndex] / 500);
    var camRot = curve[cubeIndex].getTangent(PosIndex1[cubeIndex] / 500);
    room1MovingBox[cubeIndex].translateX(camPos.x);
    room1MovingBox[cubeIndex].translateY(camPos.y);
    room1MovingBox[cubeIndex].translateZ(camPos.z);
    room1MovingBox[cubeIndex].rotateX(camRot);
    room1MovingBox[cubeIndex].rotateY(camRot);
    room1MovingBox[cubeIndex].rotateZ(camRot);
    room1MovingBox[cubeIndex].getWorldPosition(tmpPos);
    room1MovingBox[cubeIndex].getWorldQuaternion(tmpQuat);
    room1MovingBox[cubeIndex].position.x = camPos.x;
    room1MovingBox[cubeIndex].position.y = camPos.y;
    room1MovingBox[cubeIndex].position.z = camPos.z;
    room1MovingBox[cubeIndex].rotation.x = camRot.x;
    room1MovingBox[cubeIndex].rotation.y = camRot.y;
    room1MovingBox[cubeIndex].rotation.z = camRot.z;
    room1MovingBox[cubeIndex].lookAt(curve[cubeIndex].getPoint((PosIndex1[cubeIndex]+1) / 500));
}

//Rotates three.js object together with ammo.js physical properties by vector path tangent, created in createPaths.
function rotateRoom1Wall(cubeIndex){
    let scalingFactor = 0.3;

    let moveX =  kMoveDirection.right - kMoveDirection.left;
    let moveZ =  kMoveDirection.back - kMoveDirection.forward;
    let moveY =  0;


    let translateFactor = tmpPos.set(moveX, moveY, moveZ);
    translateFactor.multiplyScalar(scalingFactor);
    room1MovingBox[cubeIndex].translateX(translateFactor.x);
    room1MovingBox[cubeIndex].translateY(translateFactor.y);
    room1MovingBox[cubeIndex].translateZ(translateFactor.z);
    room1MovingBox[cubeIndex].getWorldPosition(tmpPos);
    room1MovingBox[cubeIndex].getWorldQuaternion(tmpQuat);


    let physicsBody = room1MovingBox[cubeIndex].userData.physicsBody;

    let ms = physicsBody.getMotionState();

    if ( ms ) {
        ammoTmpPos.setValue(tmpPos.x, tmpPos.y, tmpPos.z);
        ammoTmpQuat.setValue(tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w);
        tmpTrans.setIdentity();
        tmpTrans.setOrigin(ammoTmpPos);
        tmpTrans.setRotation(ammoTmpQuat);
        ms.setWorldTransform(tmpTrans);
    }

    var camRot = curve[1].getTangent(PosIndex1[1] / 500);

    room1MovingBox[cubeIndex].rotateX(camRot);
    room1MovingBox[cubeIndex].rotateY(camRot);
    room1MovingBox[cubeIndex].rotateZ(camRot);
    room1MovingBox[cubeIndex].getWorldPosition(tmpPos);
    room1MovingBox[cubeIndex].getWorldQuaternion(tmpQuat);

    room1MovingBox[cubeIndex].rotation.x = camRot.x;
    room1MovingBox[cubeIndex].rotation.y = camRot.y;
    room1MovingBox[cubeIndex].rotation.z = camRot.z;
    room1MovingBox[cubeIndex].lookAt(curve[1].getPoint((PosIndex1[1]+1) / 500));
}

//Periodic up and down movement of three.js object together with ammo.js physical properties.
function moveRoom3Cube(cubeIndex){

        let scalingFactor = 0.3;

        let moveX =  kMoveDirection.right - kMoveDirection.left;
        let moveZ =  kMoveDirection.back - kMoveDirection.forward;
        let moveY =  0;
        // console.log("room3box");
        // console.log(room3MovingBox);
        // console.log("room1box");
        // console.log(room1MovingBox);
        let translateFactor = tmpPos.set(moveX, moveY, moveZ);
        translateFactor.multiplyScalar(scalingFactor);
        room3MovingBox[cubeIndex].translateX(translateFactor.x);
        room3MovingBox[cubeIndex].translateY(translateFactor.y);
        room3MovingBox[cubeIndex].translateZ(translateFactor.z);
        room3MovingBox[cubeIndex].getWorldPosition(tmpPos);
        room3MovingBox[cubeIndex].getWorldQuaternion(tmpQuat);

        let physicsBody = room3MovingBox[cubeIndex].userData.physicsBody;

        let ms = physicsBody.getMotionState();

        if ( ms ) {
            ammoTmpPos.setValue(tmpPos.x, tmpPos.y, tmpPos.z);
            ammoTmpQuat.setValue(tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w);
            tmpTrans.setIdentity();
            tmpTrans.setOrigin(ammoTmpPos);
            tmpTrans.setRotation(ammoTmpQuat);
            ms.setWorldTransform(tmpTrans);
        }

        PosIndex3[cubeIndex] = PosIndex3[cubeIndex]+guiControls.movementSpeed*movementDir[cubeIndex];
        if (PosIndex3[cubeIndex] > 55) { movementDir[cubeIndex] = -1;}
        if (PosIndex3[cubeIndex] < -95) { movementDir[cubeIndex] = 1;}
        room3MovingBox[cubeIndex].translateY(PosIndex3[cubeIndex]);
        room3MovingBox[cubeIndex].getWorldPosition(tmpPos);
        room3MovingBox[cubeIndex].getWorldQuaternion(tmpQuat);
        room3MovingBox[cubeIndex].position.y = PosIndex3[cubeIndex];




}

//Creates room floors including ammo.js implementation.
function createRoomFloor(positionY) {

    let posBase = {x: 0, y: positionY, z: 0};
    let scale = {x: room.scale, y: 1, z: room.scale};
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 0;
    let blockPlane = []
    blockPlane.length = 3;
    for (let i = 0; i < 3; i++){
        //threeJS Section
        var texturePlane = new THREE.ImageUtils.loadTexture( 'texture/stonebricks1.jpg' );
        texturePlane.wrapS = THREE.RepeatWrapping;
        texturePlane.wrapT = THREE.RepeatWrapping;
        texturePlane.repeat.set( 60, 60 );
        blockPlane[i] = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshStandardMaterial( {
            map: texturePlane,
            side: THREE.DoubleSide} ));

        // blockPlane[i] = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshPhongMaterial({color: 0xa0afa4}));
        blockPlane[i].position.set(posBase.x + room.roomOffsetX[i], posBase.y, posBase.z);
        blockPlane[i].scale.set(scale.x, scale.y, scale.z);
        blockPlane[i].castShadow = false;
        blockPlane[i].receiveShadow = true;

        scene.add(blockPlane[i]);
        //Ammojs Section

        let transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(posBase.x + room.roomOffsetX[i], posBase.y, posBase.z));
        transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        let motionState = new Ammo.btDefaultMotionState(transform);
        let colShape = new Ammo.btBoxShape(new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5));
        colShape.setMargin(0.05);

        let localInertia = new Ammo.btVector3(0, 0, 0);
        colShape.calculateLocalInertia(mass, localInertia);

        let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
        let body = new Ammo.btRigidBody(rbInfo);

        body.setFriction(4);
        body.setRollingFriction(10);

        body.setRestitution(0.98)

        physicsWorld.addRigidBody(body);
    }

}

//Creates room walls including ammo.js implementation.
function createRoomWalls()    {
    let posBase;
    let scale;
    for (let k = 0; k < 4; k++){
        switch (k){
            case 0:
                posBase = {x: 0, y: room.scale/2, z: -room.scale/2};
                scale = {x: room.scale, y: room.scale, z: 1};
                break;
            case 1:
                posBase = {x: 0, y: room.scale/2, z: room.scale/2};
                scale = {x: room.scale, y: room.scale, z: 1};
                break;
            case 2:
                posBase = {x:room.scale/2 , y: room.scale/2, z: 0};
                scale = {x: 1, y: room.scale, z: room.scale};
                break;
            case 3:
                posBase = {x:-room.scale/2 , y: room.scale/2, z: 0};
                scale = {x: 1, y: room.scale, z: room.scale};
                break;
        }
        let quat = {x: 0, y: 0, z: 0, w: 1};
        let mass = 0;
        let blockPlane = []
        blockPlane.length = 3;
        for (let i = 0; i < 3; i++){
            //threeJS Section
            var texturePlane = new THREE.ImageUtils.loadTexture( 'texture/brick.png' );
            texturePlane.wrapS = THREE.RepeatWrapping;
            texturePlane.wrapT = THREE.RepeatWrapping;
            texturePlane.repeat.set( 10, 10 );
            blockPlane[i] = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshStandardMaterial( {
                map: texturePlane,
                side: THREE.DoubleSide,
                roughness : 1} ));

            blockPlane[i].position.set(posBase.x + room.roomOffsetX[i], posBase.y, posBase.z);
            blockPlane[i].scale.set(scale.x, scale.y, scale.z);
            blockPlane[i].castShadow = false;
            blockPlane[i].receiveShadow = true;

            scene.add(blockPlane[i]);
            //Ammojs Section

            let transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new Ammo.btVector3(posBase.x + room.roomOffsetX[i], posBase.y, posBase.z));
            transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
            let motionState = new Ammo.btDefaultMotionState(transform);
            let colShape = new Ammo.btBoxShape(new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5));
            colShape.setMargin(0.05);

            let localInertia = new Ammo.btVector3(0, 0, 0);
            colShape.calculateLocalInertia(mass, localInertia);

            let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
            let body = new Ammo.btRigidBody(rbInfo);

            body.setFriction(4);
            body.setRollingFriction(10);

            body.setRestitution(0.8)

            physicsWorld.addRigidBody(body);
        }
    }


}

//Creates three.js box object with ammo.js functions with given parameters.
function createPhysicsObj(posX,posY,posZ,degreesX,degreesY,degreesZ,sizeX,sizeY,sizeZ,roomIndex){
    let posBase = {x: posX, y: posY, z: posZ};
    let scale = {x: sizeX, y: sizeY, z: sizeZ};
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 10;


        //threeJS Section

    blockPlane[0] = new THREE.Mesh(new THREE.BoxBufferGeometry(),  new THREE.MeshPhongMaterial({color: '#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0')}));

    // blockPlane[i] = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshPhongMaterial({color: 0xa0afa4}));
    blockPlane[0] .position.set(posBase.x + room.roomOffsetX[roomIndex], posBase.y, posBase.z);
    //blockPlane.rotation.set(THREE.Math.degToRad(degreesX), THREE.Math.degToRad(degreesY), THREE.Math.degToRad(degreesZ));
    blockPlane[0] .rotation.set(THREE.Math.degToRad(degreesX), THREE.Math.degToRad(degreesY), THREE.Math.degToRad(degreesZ));
    blockPlane[0] .scale.set(scale.x, scale.y, scale.z);
    blockPlane[0] .castShadow = true;
    blockPlane[0] .receiveShadow = true;

    scene.add(blockPlane[0] );
    //Ammojs Section

    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(posBase.x + room.roomOffsetX[roomIndex], posBase.y, posBase.z));
    transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));

    let motionState = new Ammo.btDefaultMotionState(transform);
    let colShape = new Ammo.btBoxShape(new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5));
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
    let body = new Ammo.btRigidBody(rbInfo);

    body.setFriction(4);
    body.setRollingFriction(10);
    body.setRestitution(1);
    body.setActivationState( STATE.DISABLE_DEACTIVATION );
    body.setCollisionFlags( FLAGS.CF_KINEMATIC_OBJECT );

    physicsWorld.addRigidBody(body);
    blockPlane[0] .userData.physicsBody = body;

    return blockPlane[0] ;

}

//Creates three.js ball object with ammo.js functions with given parameters.
function createBall(posX,posZ)  {

    let pos = {x: posX, y: 200, z: posZ};
    let radius = 40;
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 50;

    //threeJS Section
    let ball = ballObject = new THREE.Mesh(new THREE.SphereBufferGeometry(radius,32,32), new THREE.MeshPhongMaterial({color: 0x068c27}));

    ball.position.set(pos.x, pos.y, pos.z);

    ball.castShadow = true;
    ball.receiveShadow = true;

    scene.add(ball);

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btSphereShape(radius);
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
    let body = new Ammo.btRigidBody(rbInfo);

    body.setFriction(4);
    body.setRollingFriction(10);

    body.setActivationState(STATE.DISABLE_DEACTIVATION)

    body.setRestitution(1.10)

    physicsWorld.addRigidBody(body);

    ball.userData.physicsBody = body;
    rigidBodies.push(ball);
}

//Setting up room 1 objects.
function fillRoom1(){
    createPaths();
    createCubes(0);
    createCubes(1);
    createRotatingWall(2);
}

//Setting up room 2 objects.
function fillRoom2() {

    createPlankBoxWall(200,0,1);
    createPlankBoxWall(-200,0,1);
    createPlankBoxWall(0,-300,0);
    createPlankBoxWall(0,300,0);
    createBall(300,300);
    createBall(-300,-300);
    createBall(-300,300);
    createBall(300,-300);

}

//Setting up room 3 objects.
function fillRoom3(){
    staticObject[0] = createPhysicsObj(0,50,0,0,0,0,100,100,100,2);
    staticObject[1] = createPhysicsObj(-330,70,0,0,0,0,10,190,250,2);
    staticObject[2] = createPhysicsObj(330,70,0,0,0,0,10,190,250,2);
    staticObject[3] = createPhysicsObj(0,50,330,0,0,0,250,190,10,2);
    staticObject[4] = createPhysicsObj(0,50,-330,0,0,0,250,190,10,2);
    staticObject[5] = createPhysicsObj(300,200,300,0,0,0,50,50,50,2);
    staticObject[6] = createPhysicsObj(300,200,-300,0,0,0,50,50,50,2);
    staticObject[7] = createPhysicsObj(-300,200,300,0,0,0,50,50,50,2);
    staticObject[8] = createPhysicsObj(-300,200,-300,0,0,0,50,50,50,2);

    room3MovingBox[0] = createPhysicsObj(180,10,180,0,0,0,200,200,200,2);
    room3MovingBox[1] = createPhysicsObj(180,10,-180,0,0,0,200,200,200,2);
    room3MovingBox[3] = createPhysicsObj(-180,10,180,0,0,0,200,200,200,2);
    room3MovingBox[2] = createPhysicsObj(-180,10,-180,0,0,0,200,200,200,2);
}

//Creates vectors used for movement of objects in room 1.
function createPaths(){
    curve[0] = new THREE.CatmullRomCurve3( [
        new THREE.Vector3( room.roomOffsetX[0]-250,40,250 ),
        new THREE.Vector3( room.roomOffsetX[0]+250,40,250 ),
        new THREE.Vector3( room.roomOffsetX[0]-300,40,0 ),
        new THREE.Vector3( room.roomOffsetX[0]+250,40,-250 ),
        new THREE.Vector3( room.roomOffsetX[0]-250,40,-250 ),
    ], true );
    var points = curve[0].getPoints( 100 );
    var geometry = new THREE.BufferGeometry().setFromPoints( points );
    var material = new THREE.LineBasicMaterial( { color : 0xff0000 });
    var curveObject = new THREE.Line( geometry, material );
    //scene.add(curveObject);

    curve[1] = new THREE.CatmullRomCurve3( [
        new THREE.Vector3( room.roomOffsetX[0]-250,40,250 ),
        new THREE.Vector3( room.roomOffsetX[0]+250,40,250 ),
        new THREE.Vector3( room.roomOffsetX[0]+250,40,-250 ),
        new THREE.Vector3( room.roomOffsetX[0]-250,40,-250 ),
        new THREE.Vector3( room.roomOffsetX[0]+300,40,0 ),

    ], true );
    var points2 = curve[1].getPoints( 100 );
    var geometry2 = new THREE.BufferGeometry().setFromPoints( points2 );
    var material2 = new THREE.LineBasicMaterial( { color : 0xff0000 });
    var curveObject2 = new THREE.Line( geometry2, material2 );
    //scene.add(curveObject2);


}

//Creates three.js box with ammo.js functions used in room 1.
function createCubes(cubeIndex){
    let pos = {x: room.roomOffsetX[0], y: 40, z: 0};
    let scale = {x: 100, y: 100, z: 100};
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 1;

    //threeJS Section
    var cubeTexture = new THREE.ImageUtils.loadTexture(
        'texture/metal.jpg' );
    room1MovingBox[cubeIndex] = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshStandardMaterial( {
        map: cubeTexture,
        side: THREE.DoubleSide,
        roughness : 1} ));
    room1MovingBox[cubeIndex].position.set(pos.x, pos.y, pos.z);
    room1MovingBox[cubeIndex].scale.set(scale.x, scale.y, scale.z);

    room1MovingBox[cubeIndex].castShadow = true;
    room1MovingBox[cubeIndex].receiveShadow = true;

    scene.add(room1MovingBox[cubeIndex]);


    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );

    let colShape = new Ammo.btBoxShape( new Ammo.btVector3( scale.x * 0.5, scale.y * 0.5, scale.z * 0.5 ) );
    colShape.setMargin( 0.05 );

    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );

    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );

    body.setFriction(4);
    body.setRollingFriction(10);

    body.setActivationState( STATE.DISABLE_DEACTIVATION );
    body.setCollisionFlags( FLAGS.CF_KINEMATIC_OBJECT );


    physicsWorld.addRigidBody( body );
    room1MovingBox[cubeIndex].userData.physicsBody = body;


}

//Creates three.js box with ammo.js functions used in room 1.
function createRotatingWall(cubeIndex){
    let pos = {x: room.roomOffsetX[0], y: 40, z: 0};
    let scale = {x: 400, y: 100, z: 10};
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 1;

    //threeJS Section
    var cubeTexture = new THREE.ImageUtils.loadTexture(
        'texture/tiles2.png' );
    room1MovingBox[cubeIndex] = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshStandardMaterial( {
        map: cubeTexture,
        side: THREE.DoubleSide,
        roughness : 1} ));
    room1MovingBox[cubeIndex].position.set(pos.x, pos.y, pos.z);
    room1MovingBox[cubeIndex].scale.set(scale.x, scale.y, scale.z);

    room1MovingBox[cubeIndex].castShadow = true;
    room1MovingBox[cubeIndex].receiveShadow = true;

    scene.add(room1MovingBox[cubeIndex]);


    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );

    let colShape = new Ammo.btBoxShape( new Ammo.btVector3( scale.x * 0.5, scale.y * 0.5, scale.z * 0.5 ) );
    colShape.setMargin( 0.05 );

    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );

    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );

    body.setFriction(4);
    body.setRollingFriction(10);

    body.setActivationState( STATE.DISABLE_DEACTIVATION );
    body.setCollisionFlags( FLAGS.CF_KINEMATIC_OBJECT );


    physicsWorld.addRigidBody( body );
    room1MovingBox[cubeIndex].userData.physicsBody = body;
}

//Creates three.js stacked box walls with ammo.js functions used in room 2.
function createPlankBoxWall(xOffset, zOffset, rotation){
    let pos = {x: xOffset + room.boxWallOffsetX, y: 0, z: zOffset };
    let scale = {x: 20, y: 20, z: 20};
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 2;

    //threeJS Section

    for (let i = 0; i < 5; i++){
        for (let j = 0; j < 5; j++){
            var textureCube = new THREE.ImageUtils.loadTexture( 'texture/planks.png' );
            box = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshStandardMaterial( {
                map: textureCube,
                side: THREE.DoubleSide,
                roughness : 1} ));

            box.position.set(pos.x, pos.y, pos.z);
            box.scale.set(scale.x, scale.y, scale.z);
            box.castShadow = true;
            box.receiveShadow = true;
            scene.add(box);
            container.push(box);

            //Ammojs Section
            let transform = new Ammo.btTransform();
            transform.setIdentity();
            switch (rotation){
                case 0:
                    transform.setOrigin(new Ammo.btVector3(pos.x+i*scale.x, pos.y+j*scale.z, pos.z));
                    break;
                case 1:
                    transform.setOrigin(new Ammo.btVector3(pos.x+40, pos.y+j*scale.z, pos.z+i*scale.x-40));
                    break;
            }

            transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
            let motionState = new Ammo.btDefaultMotionState(transform);

            let colShape = new Ammo.btBoxShape(new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5));
            colShape.setMargin(0.05);

            let localInertia = new Ammo.btVector3(0, 0, 0);
            colShape.calculateLocalInertia(mass, localInertia);

            let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
            let body = new Ammo.btRigidBody(rbInfo);

            body.setFriction(1000);
            body.setRollingFriction(10);

            body.setActivationState(STATE.DISABLE_DEACTIVATION);
            //body.setCollisionFlags(FLAGS.CF_KINEMATIC_OBJECT);

            body.setRestitution(0.2)

            physicsWorld.addRigidBody(body);

            box.userData.physicsBody = body;
            rigidBodies.push(box);

        }
    }

}

//Updates ammo.js objects.
function updateScene(deltaTime) {
    controls.update();
    // Step world
    physicsWorld.stepSimulation(deltaTime, 10);

    // Update rigid bodies
    for (let i = 0; i < rigidBodies.length; i++) {
        let objThree = rigidBodies[i];
        let objAmmo = objThree.userData.physicsBody;
        let ms = objAmmo.getMotionState();
        if (ms) {


            ms.getWorldTransform(tmpTrans);
            let p = tmpTrans.getOrigin();
            let q = tmpTrans.getRotation();
            objThree.position.set(p.x(), p.y(), p.z());
            objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());

        }
    }

}

//Function for rendering gui.
function setupGui(){
    const gui = new GUI()

    const roomFolder = gui.addFolder('Room Selection')
    roomFolder.add(guiControls,'resetGame')
        .name('New Game');
    level = roomFolder.add(guiControls,'toggle',
        ['Room 1', 'Room 2', 'Room 3'])
        .name('Select room')
        .listen();
    roomFolder.open()

    const ballFolder = gui.addFolder('Ball Settings')
    ballFolder.add(guiControls, 'throwingForce', 0, 1000)
    ballFolder.add(guiControls, 'bounceFactor', 0, 2)
    ballFolder.add(guiControls, 'mass', 0.1, 10)
    ballFolder.add(guiControls, 'size', 1, 50)
    ballFolder.open()

    const room13Folder = gui.addFolder('Room 1&3 Settings')
    room13Folder.add(guiControls, 'movementSpeed', 0, 5)
    room13Folder.open()

    level.onChange(
        function(newValue) {
            switch (newValue){
                case 'Room 1':
                    camera.position.set(room.roomOffsetX[0], 100, 380);
                    controls.target = new THREE.Vector3(room.roomOffsetX[0], 40, 0);

                    room1Filled = true;


                    break
                case 'Room 2':
                    camera.position.set(room.roomOffsetX[1], 70, 90);
                    controls.target = new THREE.Vector3(room.roomOffsetX[1], 40, 0);
                    fillRoom2();
                    room2Filled = true;

                    break
                case 'Room 3':
                    camera.position.set(room.roomOffsetX[2]+380, 360, 380);
                    controls.target = new THREE.Vector3(room.roomOffsetX[2], 40, 0);
                    fillRoom3();
                    room3Filled = true;
                    break
            }

        });


}
