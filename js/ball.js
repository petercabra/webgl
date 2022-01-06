// Vytvorte jednoduchú 3D hru, v ktorej hráč môže hodiť
// danú loptu vybranou silou vo vybranom smere a
// pozorovať jej skákanie. Implementujte aspoň tri
// miestnosti (levely). Pri implementácii použite zákony fyziky.

import {GUI} from './datGUI/dat.gui.module.js'

let physicsWorld, scene, camera, renderer, rigidBodies = [], tmpTrans = null
let ammoTmpPos = null, ammoTmpQuat = null;

let ballObject = null, moveDirection = {left: 0, right: 0, forward: 0, back: 0}
let box = null,
    blockPlane = null,
    cube = [null,null,null],
    curve = [null,null],
    kMoveDirection = {left: 0, right: 0, forward: 0, back: 0}, tmpPos = new THREE.Vector3(),
    tmpQuat = new THREE.Quaternion();


let mouseCoords = new THREE.Vector2(), raycaster = new THREE.Raycaster();
const STATE = {DISABLE_DEACTIVATION: 4}
const FLAGS = { CF_KINEMATIC_OBJECT: 2 }
let clock;
let controls;
let container = [];
let PosIndex = [300,0];

//Room 3 Variables (index = 2)
let room3Box = [null,null,null,null];

//GUI variables
let level = null;
var guiControls = new function() {
    this.throwingForce = 400;
    this.movementSpeed = 1;
    this.bounceFactor = 0.9;
    this.mass = 0.8;
    this.toggle = true;
    this.size = 10;
    this.boxMass = 2;
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
    fillRoom2();
    fillRoom3();
    setupEventHandlers();
    renderFrame();
    setupGui()

}

function setupPhysicsWorld() {

    let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration),
        overlappingPairCache = new Ammo.btDbvtBroadphase(),
        solver = new Ammo.btSequentialImpulseConstraintSolver();

    physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    physicsWorld.setGravity(new Ammo.btVector3(0, -380, 0));

}

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
    camera.position.set(room.roomOffsetX[2], 30, 70);
    camera.lookAt(new THREE.Vector3(room.roomOffsetX[2], 300, 0));

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
    controls.target = new THREE.Vector3(room.roomOffsetX[2], 0, 0)
}

function renderFrame() {

    let deltaTime = clock.getDelta();
    moveCube(0);
    moveCube(1);
    rotateWall(2);

    updateScene(deltaTime);

    renderer.render(scene, camera);

    requestAnimationFrame(renderFrame);

}

function setupEventHandlers() {

    window.addEventListener('keydown', handleKeyDown, false);
    window.addEventListener('keyup', handleKeyUp, false);
    window.addEventListener('mousemove', handleMouseMove, false);

}

function handleMouseMove(event) {
    mouseCoords.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );
}

function handleKeyDown(event) {

    let keyCode = event.keyCode;

    switch (keyCode) {

        case 87: //W: FORWARD
            moveDirection.forward = 1
            break;

        case 83: //S: BACK
            moveDirection.back = 1
            break;

        case 65: //A: LEFT
            moveDirection.left = 1
            break;

        case 68: //D: RIGHT
            moveDirection.right = 1
            break;

        case 32:
            shootBall();
            break;
    }
}

function handleKeyUp(event) {
    let keyCode = event.keyCode;

    switch (keyCode) {
        case 87: //FORWARD
            moveDirection.forward = 0
            break;

        case 83: //BACK
            moveDirection.back = 0
            break;

        case 65: //LEFT
            moveDirection.left = 0
            break;

        case 68: //RIGHT
            moveDirection.right = 0
            break;

        case 32:
            break;
    }

}

function shootBall() {

    raycaster.setFromCamera(mouseCoords, camera);

    // Creates a ball and throws it

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

function moveCube(cubeIndex){
    let scalingFactor = 0.3;

    let moveX =  kMoveDirection.right - kMoveDirection.left;
    let moveZ =  kMoveDirection.back - kMoveDirection.forward;
    let moveY =  0;


    let translateFactor = tmpPos.set(moveX, moveY, moveZ);
    translateFactor.multiplyScalar(scalingFactor);
    cube[cubeIndex].translateX(translateFactor.x);
    cube[cubeIndex].translateY(translateFactor.y);
    cube[cubeIndex].translateZ(translateFactor.z);
    cube[cubeIndex].getWorldPosition(tmpPos);
    cube[cubeIndex].getWorldQuaternion(tmpQuat);

    let physicsBody = cube[cubeIndex].userData.physicsBody;

    let ms = physicsBody.getMotionState();

    if ( ms ) {
        ammoTmpPos.setValue(tmpPos.x, tmpPos.y, tmpPos.z);
        ammoTmpQuat.setValue(tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w);
        tmpTrans.setIdentity();
        tmpTrans.setOrigin(ammoTmpPos);
        tmpTrans.setRotation(ammoTmpQuat);
        ms.setWorldTransform(tmpTrans);
    }

    PosIndex[cubeIndex] = PosIndex[cubeIndex]+guiControls.movementSpeed;
    if (PosIndex[cubeIndex] > 1000) { PosIndex[cubeIndex] = 0;}
    var camPos = curve[cubeIndex].getPoint(PosIndex[cubeIndex] / 500);
    var camRot = curve[cubeIndex].getTangent(PosIndex[cubeIndex] / 500);
    cube[cubeIndex].translateX(camPos.x);
    cube[cubeIndex].translateY(camPos.y);
    cube[cubeIndex].translateZ(camPos.z);
    cube[cubeIndex].rotateX(camRot);
    cube[cubeIndex].rotateY(camRot);
    cube[cubeIndex].rotateZ(camRot);
    cube[cubeIndex].getWorldPosition(tmpPos);
    cube[cubeIndex].getWorldQuaternion(tmpQuat);
    cube[cubeIndex].position.x = camPos.x;
    cube[cubeIndex].position.y = camPos.y;
    cube[cubeIndex].position.z = camPos.z;
    cube[cubeIndex].rotation.x = camRot.x;
    cube[cubeIndex].rotation.y = camRot.y;
    cube[cubeIndex].rotation.z = camRot.z;
    cube[cubeIndex].lookAt(curve[cubeIndex].getPoint((PosIndex[cubeIndex]+1) / 500));
}

function rotateWall(cubeIndex){
    let scalingFactor = 0.3;

    let moveX =  kMoveDirection.right - kMoveDirection.left;
    let moveZ =  kMoveDirection.back - kMoveDirection.forward;
    let moveY =  0;


    let translateFactor = tmpPos.set(moveX, moveY, moveZ);
    translateFactor.multiplyScalar(scalingFactor);
    cube[cubeIndex].translateX(translateFactor.x);
    cube[cubeIndex].translateY(translateFactor.y);
    cube[cubeIndex].translateZ(translateFactor.z);
    cube[cubeIndex].getWorldPosition(tmpPos);
    cube[cubeIndex].getWorldQuaternion(tmpQuat);


    let physicsBody = cube[cubeIndex].userData.physicsBody;

    let ms = physicsBody.getMotionState();

    if ( ms ) {
        ammoTmpPos.setValue(tmpPos.x, tmpPos.y, tmpPos.z);
        ammoTmpQuat.setValue(tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w);
        tmpTrans.setIdentity();
        tmpTrans.setOrigin(ammoTmpPos);
        tmpTrans.setRotation(ammoTmpQuat);
        ms.setWorldTransform(tmpTrans);
    }

    var camRot = curve[1].getTangent(PosIndex[1] / 500);

    cube[cubeIndex].rotateX(camRot);
    cube[cubeIndex].rotateY(camRot);
    cube[cubeIndex].rotateZ(camRot);
    cube[cubeIndex].getWorldPosition(tmpPos);
    cube[cubeIndex].getWorldQuaternion(tmpQuat);

    cube[cubeIndex].rotation.x = camRot.x;
    cube[cubeIndex].rotation.y = camRot.y;
    cube[cubeIndex].rotation.z = camRot.z;
    cube[cubeIndex].lookAt(curve[1].getPoint((PosIndex[1]+1) / 500));
}

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

function createPhysicsObj(posX,posY,posZ,degreesX,degreesY,degreesZ,sizeX,sizeY,sizeZ,roomIndex){
    let posBase = {x: posX, y: posY, z: posZ};
    let scale = {x: sizeX, y: sizeY, z: sizeZ};
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 1000;


        //threeJS Section

    blockPlane = new THREE.Mesh(new THREE.BoxBufferGeometry(),  new THREE.MeshPhongMaterial({color: '#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0')}));

    // blockPlane[i] = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshPhongMaterial({color: 0xa0afa4}));
    blockPlane.position.set(posBase.x + room.roomOffsetX[roomIndex], posBase.y, posBase.z);
    //blockPlane.rotation.set(THREE.Math.degToRad(degreesX), THREE.Math.degToRad(degreesY), THREE.Math.degToRad(degreesZ));
    blockPlane.rotation.set(THREE.Math.degToRad(degreesX), THREE.Math.degToRad(degreesY), THREE.Math.degToRad(degreesZ));
    blockPlane.scale.set(scale.x, scale.y, scale.z);
    blockPlane.castShadow = true;
    blockPlane.receiveShadow = true;

    scene.add(blockPlane);
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

    physicsWorld.addRigidBody(body);
    blockPlane.userData.physicsBody = body;

    return body;

}

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

function fillRoom1(){
    createPaths();
    createCubes(0);
    createCubes(1);
    createRotatingWall(2);
}

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

function fillRoom3(){
    createPhysicsObj(0,50,0,0,0,0,100,100,100,2);
    createPhysicsObj(-330,70,0,0,0,0,10,190,250,2);
    createPhysicsObj(330,70,0,0,0,0,10,190,250,2);
    createPhysicsObj(0,50,330,0,0,0,250,190,10,2);
    createPhysicsObj(0,50,-330,0,0,0,250,190,10,2);
    createPhysicsObj(300,200,300,0,0,0,50,50,50,2);
    createPhysicsObj(300,200,-300,0,0,0,50,50,50,2);
    createPhysicsObj(-300,200,300,0,0,0,50,50,50,2);
    createPhysicsObj(-300,200,-300,0,0,0,50,50,50,2);




}
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

function createCubes(cubeIndex){
    let pos = {x: room.roomOffsetX[0], y: 40, z: 0};
    let scale = {x: 100, y: 100, z: 100};
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 1;

    //threeJS Section
    var cubeTexture = new THREE.ImageUtils.loadTexture(
        'texture/metal.jpg' );
    cube[cubeIndex] = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshStandardMaterial( {
        map: cubeTexture,
        side: THREE.DoubleSide,
        roughness : 1} ));
    cube[cubeIndex].position.set(pos.x, pos.y, pos.z);
    cube[cubeIndex].scale.set(scale.x, scale.y, scale.z);

    cube[cubeIndex].castShadow = true;
    cube[cubeIndex].receiveShadow = true;

    scene.add(cube[cubeIndex]);


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
    cube[cubeIndex].userData.physicsBody = body;


}

function createRotatingWall(cubeIndex){
    let pos = {x: room.roomOffsetX[0], y: 40, z: 0};
    let scale = {x: 400, y: 100, z: 10};
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 1;

    //threeJS Section
    var cubeTexture = new THREE.ImageUtils.loadTexture(
        'texture/tiles2.png' );
    cube[cubeIndex] = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshStandardMaterial( {
        map: cubeTexture,
        side: THREE.DoubleSide,
        roughness : 1} ));
    cube[cubeIndex].position.set(pos.x, pos.y, pos.z);
    cube[cubeIndex].scale.set(scale.x, scale.y, scale.z);

    cube[cubeIndex].castShadow = true;
    cube[cubeIndex].receiveShadow = true;

    scene.add(cube[cubeIndex]);


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
    cube[cubeIndex].userData.physicsBody = body;
}

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

function moveBall() {

    let scalingFactor = 20;

    let moveX = moveDirection.right - moveDirection.left;
    let moveZ = moveDirection.back - moveDirection.forward;
    let moveY = 0;

    if (moveX == 0 && moveY == 0 && moveZ == 0) return;

    let resultantImpulse = new Ammo.btVector3(moveX, moveY, moveZ)
    resultantImpulse.op_mul(scalingFactor);

    let physicsBody = ballObject.userData.physicsBody;
    physicsBody.setLinearVelocity(resultantImpulse);

}

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

function setupGui(){
    const gui = new GUI()

    const roomFolder = gui.addFolder('Room Selection')
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
                    console.log('Room 1');

                    camera.position.set(room.roomOffsetX[0], 30, 70);
                    controls.target = new THREE.Vector3(room.roomOffsetX[0], 0, 0)

                    break
                case 'Room 2':
                    console.log('Room 2');
                    camera.position.set(room.roomOffsetX[1], 30, 70);
                    controls.target = new THREE.Vector3(room.roomOffsetX[1], 0, 0)

                    break
                case 'Room 3':
                    console.log('Room 3');
                    camera.position.set(room.roomOffsetX[2], 30, 70);
                    controls.target = new THREE.Vector3(room.roomOffsetX[2], 0, 0)

                    break
            }

        });


}
