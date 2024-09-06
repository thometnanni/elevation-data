import * as THREE from 'three';
import * as geotiff from 'geotiff';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);


const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

let mesh, dot;


const groundPlaneGeometry = new THREE.PlaneGeometry(5000, 5000);
const groundPlaneMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide });
const groundPlane = new THREE.Mesh(groundPlaneGeometry, groundPlaneMaterial);


groundPlane.position.set(0, 0, 0);
groundPlane.rotation.x = Math.PI / 2;
groundPlane.rotation.y = Math.PI;
scene.add(groundPlane);


async function loadGeoTIFF(url) {
    try {
        const tiff = await geotiff.fromUrl(url);
        const image = await tiff.getImage();

        const width = image.getWidth();
        const height = image.getHeight();

        const data = await image.readRasters();
        const elevation = data[0];

        const minElevation = Math.min(...elevation);
        const maxElevation = Math.max(...elevation);


        for (let i = 0; i < elevation.length; i++) {
            elevation[i] -= minElevation;
        }

        const tiepoint = image.getTiePoints()[0];
        const pixelScale = image.getFileDirectory().ModelPixelScale;
        const originX = tiepoint.x;
        const originY = tiepoint.y;
        const pixelWidth = pixelScale[0];
        const pixelHeight = pixelScale[1];

        console.log('GeoTIFF Metadata:', { originX, originY, pixelWidth, pixelHeight });


        const geometry = new THREE.PlaneGeometry(
            width,
            height,
            width - 1,
            height - 1
        );


        for (let i = 0; i < geometry.attributes.position.count; i++) {
            geometry.attributes.position.setZ(i, elevation[i]);
        }

        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            wireframe: true,
        });


        mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(-width / 2, 0, height / 2);


        mesh.rotation.x = Math.PI / 2;
        mesh.rotation.y = Math.PI;

        scene.add(mesh);


        const maxDimension = Math.max(width, height);
        camera.position.set(0, maxDimension, maxDimension * 1.5);
        camera.lookAt(0, 0, 0);


        const ambientLight = new THREE.AmbientLight(0xffffff);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff);
        directionalLight.position.set(0, 1, 1).normalize();
        scene.add(directionalLight);


        const lat = 52.479846104514024;
        const lon = 13.432181701035297;
        addDotAtCoordinates(lat, lon, originX, originY, pixelWidth, pixelHeight, geometry, elevation, width, height);

    } catch (error) {
        console.error("Error loading GeoTIFF:", error);
    }
}


function addDotAtCoordinates(lat, lon, originX, originY, pixelWidth, pixelHeight, geometry, elevation, width, height) {

    const x = (lon - originX) / pixelWidth;
    const y = (originY - lat) / pixelHeight;


    const centeredX = x - width / 2;
    const centeredY = y - height / 2;

    if (x < 0 || x > width || y < 0 || y > height) {
        console.error('Coordinates are outside of the image bounds.');
        return;
    }


    const index = Math.floor(y) * width + Math.floor(x);
    const elevationAtPoint = elevation[index];


    const dotGeometry = new THREE.SphereGeometry(1, 16, 16);
    const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    dot = new THREE.Mesh(dotGeometry, dotMaterial);


    dot.position.set(centeredX, elevationAtPoint, centeredY);


    dot.rotation.x = Math.PI / 2;
    dot.rotation.y = Math.PI;

    scene.add(dot);
}


function animate() {
    requestAnimationFrame(animate);

    // if (mesh) {
    //     dot.rotation.z += 0.001;
    //     mesh.rotation.z += 0.001;
    // }
    controls.update();
    renderer.render(scene, camera);
}

loadGeoTIFF('/textures/berlin.tif');
animate();
