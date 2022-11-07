import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.112.1/build/three.module.js';
//import {ColladaLoader} from 'https://cdn.jsdelivr.net/npm/three@0.112.1/examples/jsm/loaders/ColladaLoader.js';
//import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.112.1/examples/jsm/loaders/FBXLoader.js';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.112.1/examples/jsm/loaders/GLTFLoader.js';
import {GUI} from 'https://cdn.jsdelivr.net/npm/three@0.112.1/examples/jsm/libs/dat.gui.module.js';
// import {Sky} from 'https://cdn.jsdelivr.net/npm/three@0.112.1/examples/jsm/objects/Sky.js';
//import {BufferGeometryUtils} from 'https://cdn.jsdelivr.net/npm/three@0.112.1/examples/jsm/utils/BufferGeometryUtils.js';
//test

import {agent} from './agent.js'; //enemy code
import {controls} from './controls.js'; // control code
import {game} from './game.js';//overall game elements
import {math} from './math.js'; // necessary math formulas
import {visibility} from './visibility.js';
import {particles} from './particles.js';
import {blaster} from './blaster.js'; // attack settings


let _APP = null;
let enemy_number1=true;
let enemy_number2=true;
const _NUM_BOIDS = 1;
const _BOID_SPEED = 0;
const _BOID_ACCELERATION = _BOID_SPEED / 2.5;
const _BOID_FORCE_MAX = _BOID_ACCELERATION / 20.0;
let collidableMeshList = [];
var cubeGeometry = new THREE.CubeGeometry(5,5,5,1,1,1);
var wireMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe:true } );
var MovingCube = new THREE.Mesh( cubeGeometry, wireMaterial );
var cnt = 0;

class PlayerEntity {
  constructor(params) {
    this._model = params.model;
    this._params = params;
    this._game = params.game;
    this._fireCooldown = 0.0;
    this._velocity = new THREE.Vector3(0, 0, 0);
    this._direction = new THREE.Vector3(0, 0, -1);
    this._health = 1000.0;

    // MovingCube.position.set(this._model.position);

    const x = 2.75;
    const y1 = 1.5;
    const y2 = 0.4;
    const z = 4.0;
    this._offsets = [
        new THREE.Vector3(-x, y1, -z),
        new THREE.Vector3(x, y1, -z),
        // new THREE.Vector3(-x, -y2, -z),
        // new THREE.Vector3(x, -y2, -z),
    ];

    this._offsetIndex = 0;
    this._visibilityIndex = this._game._visibilityGrid.UpdateItem(
        this._model.uuid, this);
  }

  get Enemy() {
    return false;
  }

  get Velocity() {
    return this._velocity;
  }

  get Direction() {
    return this._direction;
  }

  get Position() {
    return this._model.position;
  }

  get Radius() {
    return 1.0;
  }

  get Health() {
    return this._health;
  }

  set Health(value) {
    this._health = value;
  }

  get Dead() {
    return (this._health <= 0.0);
  }

  // 지형에 충돌이 감지되면 TakeDamage로 오브젝트 파괴 예정
  TakeDamage(dmg) {
    this._params.game._entities['_explosionSystem'].Splode(this.Position);

    this._health -= dmg;
    if (this._health <= 0.0) {
      console.log("게임 종료");
      this._CreateGameGUI()
    }    
  }

  Fire() {
    if (this._fireCooldown > 0.0) {
      return;
    }

    this._fireCooldown = 0.05;

    const p = this._params.game._entities['_blasterSystem'].CreateParticle();
    p.Start = this._offsets[this._offsetIndex].clone();
    p.Start.applyQuaternion(this._model.quaternion);
    p.Start.add(this.Position);
    p.End = p.Start.clone();
    p.Velocity = this.Direction.clone().multiplyScalar(500.0);
    p.Length = 50.0;
    p.Colours = [
        new THREE.Color(4.0, 2.5, 0.5), new THREE.Color(0.0, 0.0, 0.0)];
    p.Life = 2.0;
    p.TotalLife = 2.0;
    p.Width = 0.25;

    this._offsetIndex = (this._offsetIndex + 1) % this._offsets.length;
  }

  Update(timeInSeconds) {
    if (this.Dead) {
      return;
    }

    // 속도가 증가하여 발포된 총알에 비행기 메쉬가 충돌판정되는 일이 생깁니다.
    // 이를 막을 방법이 마땅치않아 게임오버되지 않게 초당 체력을 계속해서 회복시켜줍니다.
    // 지형 충돌에 의한 파괴는 곧바로 체력이 0 이하로 떨어지기 때문에 막을 수 없습니다.
    if(this.Health < 1000) {
      this.Health = 1000;
    }

    // MovingCube.position.set(this._model.position);
    MovingCube.position.x = this._model.position.x;
    MovingCube.position.y = this._model.position.y + 1.5;
    MovingCube.position.z = this._model.position.z;


    var originPoint = this._model.position.clone();

    for (var vertexIndex = 0; vertexIndex < cubeGeometry.vertices.length; vertexIndex++)
    {
      var localVertex = MovingCube.geometry.vertices[vertexIndex].clone();
      var globalVertex = localVertex.applyMatrix4( MovingCube.matrix );
      var directionVector = globalVertex.sub( this._model.position.clone() );

      var ray = new THREE.Raycaster( originPoint, directionVector.clone().normalize() );
      var collisionResults = ray.intersectObjects( collidableMeshList );

      if ( collisionResults.length > 0 && collisionResults[0].distance < directionVector.length() ) {
        console.log("collision detected");
        // Because it recognized the gltf model at first, number 8 is inevitably judged as a collision.
        // In order to prevent the game from ending at that time, the first 8 collisions are invalidated.
        // cnt++ > 8 ? this.TakeDamage(1111) : {};
        this.TakeDamage(1111);

      }
    }

    this._visibilityIndex = this._game._visibilityGrid.UpdateItem(
        this._model.uuid, this, this._visibilityIndex);
    this._fireCooldown -= timeInSeconds;
    this._burstCooldown = Math.max(this._burstCooldown, 0.0);
    this._direction.copy(this._velocity);
    this._direction.normalize();
    this._direction.applyQuaternion(this._model.quaternion);
  }

  _CreateGameGUI() {
    const guiDiv = document.createElement('div');
    guiDiv.className = 'guiRoot guiBox';

    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'vertical';

    const scoreTitle = document.createElement('div');
    scoreTitle.className = 'guiBigText';
    scoreTitle.innerText = 'Mission';

    const scoreText = document.createElement('div');
    scoreText.className = 'guiSmallText';
    scoreText.innerText = 'FAILED';

    const retryButton = document.createElement('button');
    retryButton.className = 'retryButton';
    retryButton.innerText = 'Try again';
    retryButton.onclick = function () {
      location.reload();
    }

    // When the mission is completed, use the code below to correct the success
    // document.getElementById('scoreText').innerText = 'SUCCESS';

    scoreText.id = 'scoreText';

    scoreDiv.appendChild(scoreTitle);
    scoreDiv.appendChild(scoreText);

    guiDiv.appendChild(scoreDiv);
    guiDiv.appendChild(retryButton);
    document.body.appendChild(guiDiv);
  }

}


class ExplodeParticles {
  constructor(game) {
    this._particleSystem = new particles.ParticleSystem(
        game, {texture: "./resources/explosion.png"});
    this._particles = [];
  }

  Splode(origin) {
    for (let i = 0; i < 96; i++) {
      const p = this._particleSystem.CreateParticle();
      p.Position.copy(origin);
      p.Velocity = new THREE.Vector3(
          math.rand_range(-1, 1),
          math.rand_range(-1, 1),
          math.rand_range(-1, 1)
      );
      p.Velocity.normalize();
      p.Velocity.multiplyScalar(50);
      p.TotalLife = 2.0;
      p.Life = p.TotalLife;
      p.Colours = [new THREE.Color(0xFF8010), new THREE.Color(0xFF8010)];
      p.Sizes = [4, 16];
      p.Size = p.Sizes[0];
      this._particles.push(p);
    }
  }

  Update(timeInSeconds) {
    const _V = new THREE.Vector3();

    this._particles = this._particles.filter(p => {
      return p.Alive;
    });
    for (const p of this._particles) {
      p.Life -= timeInSeconds;
      if (p.Life <= 0) {
        p.Alive = false;
      }
      p.Position.add(p.Velocity.clone().multiplyScalar(timeInSeconds));

      _V.copy(p.Velocity);
      _V.multiplyScalar(10.0 * timeInSeconds);
      const velocityLength = p.Velocity.length();

      if (_V.length() > velocityLength) {
        _V.normalize();
        _V.multiplyScalar(velocityLength)
      }

      p.Velocity.sub(_V);
      p.Size = math.lerp(p.Life / p.TotalLife, p.Sizes[0], p.Sizes[1]);
      p.Colour.copy(p.Colours[0]);
      p.Colour.lerp(p.Colours[1], 1.0 - p.Life / p.TotalLife);
      p.Opacity = math.smootherstep(p.Life / p.TotalLife, 0.0, 1.0);
    }
    this._particleSystem.Update();
  }
};


class ProceduralTerrain_Demo extends game.Game {
  constructor() {
    super();
  }

  _OnInitialize() {
    this._CreateGUI();
    
    // Create a fighter position
    this._userCamera = new THREE.Object3D();
    this._userCamera.position.set(4100, 0, 0);
    
    this._graphics.Camera.position.set(4000, 400, 4450);
    this._graphics.Camera.quaternion.set(-0.032, 0.885, 0.062, 0.46);

    this._score = 0;

    // This is 2D but eh, whatever.
    this._visibilityGrid = new visibility.VisibilityGrid(
      [new THREE.Vector3(-10000, 0, -10000), new THREE.Vector3(10000, 0, 10000)],
      [100, 100]);

    this._entities['_explosionSystem'] = new ExplodeParticles(this);
    this._entities['_blasterSystem'] = new blaster.BlasterSystem(
        {
            game: this,
            texture: "./resources/blaster.jpg",
            visibility: this._visibilityGrid,
        });
    this._library = {};
    var model;
    let loader = new GLTFLoader();

    // FLOOR
    // texture used to generate "bumpiness"
    var bumpTexture = new THREE.ImageUtils.loadTexture( 'resources/another_heightmap.png' );
    bumpTexture.wrapS = bumpTexture.wrapT = THREE.RepeatWrapping; 
    // magnitude of normal displacement
    var bumpScale   = 400.0;
    
    var oceanTexture = new THREE.ImageUtils.loadTexture( 'resources/dirt-512.jpg' );
    oceanTexture.wrapS = oceanTexture.wrapT = THREE.RepeatWrapping; 
    
    var sandyTexture = new THREE.ImageUtils.loadTexture( 'resources/sand-512.jpg' );
    sandyTexture.wrapS = sandyTexture.wrapT = THREE.RepeatWrapping; 
    
    var grassTexture = new THREE.ImageUtils.loadTexture( 'resources/coast_sand_rocks.jpg' );
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping; 
    
    var rockyTexture = new THREE.ImageUtils.loadTexture( 'resources/coast_rocks.png' );
    rockyTexture.wrapS = rockyTexture.wrapT = THREE.RepeatWrapping; 
    
    var snowyTexture = new THREE.ImageUtils.loadTexture( 'resources/snow-512.jpg' );
    snowyTexture.wrapS = snowyTexture.wrapT = THREE.RepeatWrapping; 

    
    // use "this." to create global object
    this.customUniforms = {
      bumpTexture:	{ type: "t", value: bumpTexture },
      bumpScale:	    { type: "f", value: bumpScale },
      oceanTexture:	{ type: "t", value: oceanTexture },
      sandyTexture:	{ type: "t ", value: sandyTexture },
      grassTexture:	{ type: "t", value: grassTexture },
      rockyTexture:	{ type: "t", value: rockyTexture },
      snowyTexture:	{ type: "t", value: snowyTexture },
    };
    
    // create custom material from the shader code above
    //   that is within specially labelled script tags
    var customMaterial = new THREE.ShaderMaterial(
    {
      uniforms: customUniforms,
      vertexShader:   document.getElementById( 'vertexShader'   ).textContent,
      fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
      // side: THREE.DoubleSide
    }   );
    // Create collision mesh
    var planeGeo = new THREE.PlaneGeometry( 10000, 10000, 100, 100 );
    var plane = new THREE.Mesh(	planeGeo, customMaterial );
    plane.rotation.x = -Math.PI / 2;
    plane.position.x=8000;
    plane.position.y=-100;
    plane.position.z=0;
    collidableMeshList.push(plane);
    this._graphics.Scene.add( plane );

    var iceTex = new THREE.ImageUtils.loadTexture( 'resources/ice.png' );
    iceTex.wrapS = iceTex.wrapT = THREE.RepeatWrapping;
    iceTex.repeat.set(5,5);
    var iceMat = new THREE.MeshBasicMaterial( {map: iceTex, transparent:true, opacity:0.40} );
    var ice = new THREE.Mesh(	planeGeo, iceMat );
    ice.rotation.x = -Math.PI / 2;
    ice.position.x=8000;
    ice.position.y=-30;
    ice.position.z=0;
    collidableMeshList.push(ice);
    this._graphics.Scene.add( ice);
    MovingCube.material.transparent=true;
    MovingCube.material.opacity=0;
    this._graphics.Scene.add(MovingCube);

    var wallGeometry = new THREE.CubeGeometry( 10000, 20, 6000, 1, 1, 1 );
    var wallMaterial = new THREE.MeshBasicMaterial( {color: 0x0000ff, opacity: 0, transparent: true} );
    var HorizontalGeometry = new THREE.CubeGeometry( 10000, 20, 6000, 1, 1, 1 );
    var VerticalGeometry = new THREE.CubeGeometry( 15000, 20, 15000, 1, 1, 1 );
    var wallMaterial = new THREE.MeshBasicMaterial( {color: 0x0000ff, opacity: 0.3, transparent: true} );
    var wireMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe:true } );

    var bunkerGeometry = new THREE.CubeGeometry( 10, 10, 10, 1, 1, 1 );
    var bunkerGeometry = new THREE.CubeGeometry( 30, 30, 30, 1, 1, 1 );
    var bunkerMaterial = new THREE.MeshBasicMaterial( {color: 0x0000ff, opacity: 0, transparent: true} );
    var bunkerMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe:true } );

   var wall = new THREE.Mesh(HorizontalGeometry, wallMaterial);
    var mountainGeometry = new THREE.CubeGeometry( 10000, 50, 10000, 1, 1, 1 );
    var mountainMaterial = new THREE.MeshBasicMaterial( {color: 0x0000ff, opacity: 0, transparent: true} );
    var mountainMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe:false } );

   var wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(5000,450,0);
    wall.rotation.y = 3.14159 / 2;
    wall.material.transparent = true;
    wall.material.opacity = 0;
    this._graphics.Scene.add(wall);
    collidableMeshList.push(wall);

    var wall2 = new THREE.Mesh(VerticalGeometry, wallMaterial);
    wall2.position.set(10000,450,5000);
    wall2.rotation.x = 3.14159 / 2;
    wall2.material.transparent = true;
    wall2.material.opacity = 0.3;
    this._graphics.Scene.add(wall2);
    collidableMeshList.push(wall2);

    var wall3 = new THREE.Mesh(VerticalGeometry, wallMaterial);
    wall3.position.set(10000,450,-5000);
    wall3.rotation.x = 3.14159 / 2;
    wall3.material.transparent = true;
    wall3.material.opacity = 0.3;
    this._graphics.Scene.add(wall3);
    collidableMeshList.push(wall3);

    var wall4 = new THREE.Mesh(VerticalGeometry, wallMaterial);
    wall4.position.set(13500,450,0);
    wall4.rotation.z = 3.14159 / 2;
    wall4.material.transparent = true;
    wall4.material.opacity = 0.3;
    this._graphics.Scene.add(wall4);
    collidableMeshList.push(wall4);

    var wall5 = new THREE.Mesh(VerticalGeometry, wallMaterial);
    wall5.position.set(-100,450,0);
    wall5.rotation.z = 3.14159 / 2;
    wall5.material.transparent = true;
    wall5.material.opacity = 0.3;
    this._graphics.Scene.add(wall5);
    collidableMeshList.push(wall5);

    // var wall = new THREE.Mesh(wallGeometry, wireMaterial);
    // wall.position.set(8000,450,0);
    // wall.rotation.y = 3.14159 / 2;
    // wall.material.transparent = true;
    // wall.material.opacity = 0.3;
    // this._graphics.Scene.add(wall);

    var bunkerColliderMesh = new THREE.Mesh(bunkerGeometry, bunkerMaterial);
    bunkerColliderMesh.position.set(11400,200,-500);
    bunkerColliderMesh.rotation.y = 3.14159 / 2;
    bunkerColliderMesh.material.transparent = true;
    bunkerColliderMesh.material.opacity = 0;
    this._graphics.Scene.add(bunkerColliderMesh);
    collidableMeshList.push(bunkerColliderMesh);

    var mountainWall = new THREE.Mesh(mountainGeometry, mountainMaterial);
    mountainWall.position.set(13000,1200,-1500);
    mountainWall.rotation.y = 3.14159 / 2;
    mountainWall.material.transparent = true;
    mountainWall.material.opacity = 0;
    this._graphics.Scene.add(mountainWall);
    collidableMeshList.push(mountainWall);

    loader.setPath('./resources/models/x-wing/');
    loader.load('scene.gltf', (gltf) => {
      model = gltf.scene.children[0];
      model.scale.setScalar(0.5);
      model.rotation.z = 116.2

      //animate();
      const group = new THREE.Group();
      group.add(model);

      this._graphics.Scene.add(group);

      this._entities['player'] = new PlayerEntity(
          {model: group, camera: this._graphics.Camera, game: this});

      this._entities['_controls'] = new controls.ShipControls({
        target: this._entities['player'],
        camera: this._graphics.Camera,
        scene: this._graphics.Scene,
        domElement: this._graphics._threejs.domElement,
        gui: this._gui,
        guiParams: this._guiParams,
      });
    });
    var time = 0;
    function animate() {
      model.rotation.z = time += 0.1;
      console.log(model.rotation.z);
      requestAnimationFrame(animate);
    }
    loader = new GLTFLoader();
    loader.setPath('./resources/models/target/');
    loader.load('scene.gltf', (obj) => {
      obj.scene.traverse((c) => {
        if (c.isMesh) {
          const model = obj.scene.children[0];
          model.scale.setScalar(10);
          model.rotateZ(Math.PI / 2.0);
          this._library['target'] = model;
        }

        if (this._library['target']) {
          if(enemy_number1){
            this._CreateEnemy1();
            enemy_number1=false;
          }
        }
      });
    });
    loader = new GLTFLoader();
    loader.setPath('./resources/models/bunker/');
    loader.load('scene.gltf', (obj) => {
      obj.scene.traverse((c) => {
        if (c.isMesh) {
          const model = obj.scene.children[0];
          model.scale.setScalar(8);
          model.rotateZ(Math.PI / 2.0);
          this._library['bunker'] = model;
        }

        if (this._library['bunker']) {
          if(enemy_number2){
            this._CreateEnemy2();
            enemy_number2=false;

          }
        }
      });
    });
    this._LoadBackground();
  }

  // Target creation
  _CreateEnemy1() { 
    const positions = [
      new THREE.Vector3(8000, 0, 0),
      new THREE.Vector3(-7000, 50, -100),
    ];
    const colours = [
      new THREE.Color(4.0, 0.5, 0.5),
      new THREE.Color(0.5, 0.5, 4.0),
    ];

    for (let j = 0; j < 2; j++) {
      const p = positions[j];



      for (let i = 0; i < _NUM_BOIDS; i++) {
        
        let params = {
          mesh: this._library['target'].clone(),
          speedMin: 1.0,
          speedMax: 1.0,
          speed: _BOID_SPEED,
          maxSteeringForce: _BOID_FORCE_MAX,
          acceleration: _BOID_ACCELERATION,
          seekGoal: p,
          colour: colours[j],
        };
        console.log(params);
        const e = new agent.Agent(this, params);
        this._entities['_boid_' + i] = e;
      }
      break;
    }
  }

  _CreateEnemy2() { 
    const positions = [
      new THREE.Vector3(8000, 0, 0),
      new THREE.Vector3(-7000, 50, -100),
    ];
    const colours = [
      new THREE.Color(4.0, 0.5, 0.5),
      new THREE.Color(0.5, 0.5, 4.0),
    ];

    for (let j = 0; j < 2; j++) {
      const p = positions[j];



      for (let i = 0; i < _NUM_BOIDS; i++) {
        
        let params = {
          mesh: this._library['bunker'].clone(),
          speedMin: 1.0,
          speedMax: 1.0,
          speed: _BOID_SPEED,
          maxSteeringForce: _BOID_FORCE_MAX,
          acceleration: _BOID_ACCELERATION,
          seekGoal: p,
          colour: colours[j],
        };
        console.log(params);
        const e = new agent.Agent(this, params);
        this._entities['_boid_' + i] = e;
      }
      break;
    }
  }

  // Mission Success
  EnemyDied() {
    this._score++;
    const guiDiv = document.createElement('div');
    guiDiv.className = 'guiRoot guiBox';

    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'vertical';

    const scoreTitle = document.createElement('div');
    scoreTitle.className = 'guiBigText';
    scoreTitle.innerText = 'Mission';

    const scoreText = document.createElement('div');
    scoreText.className = 'guiSmallText';
    scoreText.innerText = 'SUCCESS';

    const retryButton = document.createElement('button');
    retryButton.className = 'retryButton';
    retryButton.innerText = 'Try again';
    retryButton.onclick = function () {
      location.reload();
    }

    scoreText.id = 'scoreText';

    scoreDiv.appendChild(scoreTitle);
    scoreDiv.appendChild(scoreText);

    guiDiv.appendChild(scoreDiv);
    guiDiv.appendChild(retryButton);
    document.body.appendChild(guiDiv);

    if (true) {
      return;
    }
  }

  _CreateGUI() {
    this._CreateControlGUI();
  }


  _CreateControlGUI() {
    this._guiParams = {
      general: {
      },
    };
    this._gui = new GUI();
    this._gui.hide();

    const generalRollup = this._gui.addFolder('General');
    this._gui.close();
  }

  _LoadBackground() {

    this._graphics.Scene.background = new THREE.Color(0xFFFFFF);
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
      "./resources/right.jpg",
      "./resources/left.jpg",
      "./resources/top.jpg",
      "./resources/bottom.jpg",
      "./resources/front.jpg",
      "./resources/back.jpg"
      
    ]);
    this._graphics._scene.background = texture;
  }


  _OnStep(timeInSeconds) {
  }
}


function _Main() {
  _APP = new ProceduralTerrain_Demo();
}

_Main();
