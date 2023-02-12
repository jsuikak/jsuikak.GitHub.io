import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min';
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment";

import model_path from 'url:./models/gltf/Path6.glb';

let camera, scene, renderer, controls;
let model, mixer, action, clock;
let gui;
let gui_controller_progress,
    gui_controller_auto_play;
let animation_info = {
    maxTime: 6, //动画最长时间
    progress: 0, //设置动画进度的时间
    auto_play: true
};
let raycaster;
let mouseVector;
let selectObject;

init();

function init() {
    window.addEventListener('resize', onWindowResize);
    window.addEventListener("click", onDocumentMouseMove)

    document.onkeydown = function (e) {
        if (e.keyCode == 32) {
            animation_info.auto_play = !animation_info.auto_play;
        }
    }

    scene =
        new THREE.Scene();

    renderer =
        new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);

    camera =
        new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    scene.add(camera)
    //*************************************//

    controls =
        new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 1;
    controls.maxDistance = 10;
    controls.target.set(0, 5, 1);
    controls.update();

    scene.add(new THREE.AxesHelper(5)); //坐标轴
    clock = new THREE.Clock();//辅助更新动画
    gui = new GUI();

    raycaster = new THREE.Raycaster();
    mouseVector = new THREE.Vector2();
    selectObject = null
    //=====灯光=====
    const spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.set(0, 50, 300);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.camera.near = 500;
    spotLight.shadow.camera.far = 4000;
    spotLight.shadow.camera.fov = 30;
    scene.add(spotLight);

    const spotLight2 = new THREE.SpotLight(0xffffff);
    spotLight2.position.set(0, 50, -300);
    spotLight2.castShadow = true;
    spotLight2.shadow.mapSize.width = 1024;
    spotLight2.shadow.mapSize.height = 1024;
    spotLight2.shadow.camera.near = 500;
    spotLight2.shadow.camera.far = 4000;
    spotLight2.shadow.camera.fov = 30;
    scene.add(spotLight2);
    //=====end灯光=====

    //环境纹理
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);
    const texture = new THREE.TextureLoader().load('textures/3.png');
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    //end环境纹理

    //环境
    const environment = new RoomEnvironment();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.background = new THREE.Color(0xbbbbbb);
    scene.environment = pmremGenerator.fromScene(environment).texture;
    //end环境

    new GLTFLoader()
        .load(model_path, function (gltf) {
            model = gltf.scene;
            scene.add(model)//加载的模型添入场景
            model.scale.set(4, 4, 4);

            //controls.update() must be called after any manual changes to the camera's transform
            camera.position.set(0, 6, 5);
            controls.target.set(0, 4.5, 0);
            controls.update();

            let clip = gltf.animations[0];
            animation_info.maxTime = clip.duration;

            mixer = new THREE.AnimationMixer(gltf.scene);
            mixer.clipAction(clip).play();//播放动画

            //加载完成时进入run
            run();
        }, function (xhr) {
            //加载时调用
            console.log("模型加载中: " + (xhr.loaded / xhr.total * 100).toFixed(2) + '%');
        }, function (error) {
            //出错时调用
            console.log('An error happened');
        });

    gui_controller_progress = gui.add(animation_info, "progress", 0, animation_info.maxTime)//自动变为条形控件，设置最小和最大值
        .onChange(function () {
            //手动拉进度条时，停止自动播放
            if (animation_info.auto_play)
                animation_info.auto_play = false;
        })
        .name("进度");
    gui_controller_auto_play = gui.add(animation_info, "auto_play")//bool值，自动变为勾选控件
        .name("自动播放");

}

//end init()

function run() {
    requestAnimationFrame(run);//请求动画帧, 每一帧运行run

    if (!animation_info.auto_play)//不是自动播放时，通过进度条改变进度
    {
        mixer.setTime(animation_info.progress);
    } else {
        animation_info.progress = mixer.time;
        gui_controller_progress.updateDisplay();/*进度面板数据更新*/
    }

    const dt = clock.getDelta();
    if (mixer) {
        mixer.update(dt);//推动动画进度
    }
    if (animation_info.progress >= animation_info.maxTime) {
        animation_info.progress = 0;
        mixer.setTime(0);
    }
    //更新gui面板数据
    //
    gui_controller_auto_play.updateDisplay();/*自动播放面板数据更新*/

    controls.update(); // required if damping enabled
    render();//渲染一次场景
}

function render() {
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function getIntersects(x, y) {
    x = (x / window.innerWidth) * 2 - 1;
    y = -(y / window.innerHeight) * 2 + 1;
    mouseVector.set(x, y);

    //通过摄像机和鼠标位置更新射线
    raycaster.setFromCamera(mouseVector, camera);

    // 返回物体和射线的焦点
    return raycaster.intersectObject(model, true);
}

function onDocumentMouseMove(event) {
    var intersects = getIntersects(event.layerX, event.layerY);
    if (intersects.length > 0) {
        var res = intersects.filter(function (res) {
            return res && res.object
        })[0];
        if (res && res.object) {
            selectObject = res.object;

            alert(selectObject.name)

            var title = document.getElementById("title");
            title.style.display = "block";
        }
    }
}