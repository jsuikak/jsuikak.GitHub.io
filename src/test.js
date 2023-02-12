import * as THREE from 'three';

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min';
import { TextureLoader } from 'three';
import pic from "./textures/3.png"

new TextureLoader().load(pic,
    function (t) { console.log(t); }
    , function (t) { console.log(t)}
    , function (err) { console.log("error!"); })