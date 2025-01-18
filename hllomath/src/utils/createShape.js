import * as THREE from 'three';

export default function createShape(type, shapeDimensions, scale, currentShape) {
    let geometry;
    switch (type) {
      case 'CUBOID':
        geometry = new THREE.BoxGeometry(
          shapeDimensions.length,
          shapeDimensions.height,
          shapeDimensions.width
        );
        break;
      case 'SPHERE':
        geometry = new THREE.SphereGeometry(shapeDimensions.radius, 32, 32);
        break;
      case 'CYLINDER':
        geometry = new THREE.CylinderGeometry(
          shapeDimensions.radius,  // top radius
          shapeDimensions.radius,  // bottom radius (same for cylinder)
          shapeDimensions.height,  // height
          32  // segments
        );
        break;
      case 'CONE':
        geometry = new THREE.ConeGeometry(
          shapeDimensions.radius, 
          shapeDimensions.height, 
          32
        );
        break;
      case 'PYRAMID':
        // Create a custom pyramid geometry with rectangular base
        const halfLength = shapeDimensions.baseLength / 2;
        const halfWidth = shapeDimensions.baseWidth / 2;
        const height = shapeDimensions.height;

        const vertices = new Float32Array([
          // Base vertices
          -halfLength, 0, -halfWidth,  // 0
          halfLength, 0, -halfWidth,   // 1
          halfLength, 0, halfWidth,    // 2
          -halfLength, 0, halfWidth,   // 3
          0, height, 0                 // 4 (apex)
        ].flat());

        const indices = new Uint16Array([
          // Base
          0, 1, 2,
          0, 2, 3,
          // Sides
          0, 4, 1,
          1, 4, 2,
          2, 4, 3,
          3, 4, 0
        ]);

        geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        geometry.computeVertexNormals();
        break;
      default:
        return null;
    }

    const material = new THREE.MeshPhongMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8,
      wireframe: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(scale, scale, scale);
    addShapeLabel(mesh, currentShape);
    return mesh;
};

const addShapeLabel = (shape, currentShape) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    
    context.font = 'Bold 32px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText(currentShape, canvas.width/2, canvas.height/2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.y = 2;
    sprite.scale.set(2, 1, 1);
    shape.add(sprite);
};