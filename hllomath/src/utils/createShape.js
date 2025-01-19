import * as THREE from 'three';

let shapes = []; // Store all shapes globally for easy access

export default function createShape(type, shapeDimensions, scale, currentShape) {
  let geometry;

  // Define geometry based on shape type
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
        shapeDimensions.radius, // Top radius
        shapeDimensions.radius, // Bottom radius
        shapeDimensions.height, // Height
        32 // Segments
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
      // Custom pyramid geometry with a rectangular base
      const halfLength = shapeDimensions.baseLength / 2;
      const halfWidth = shapeDimensions.baseWidth / 2;
      const height = shapeDimensions.height;

      const vertices = new Float32Array([
        // Base vertices
        -halfLength, 0, -halfWidth, // 0
        halfLength, 0, -halfWidth,  // 1
        halfLength, 0, halfWidth,   // 2
        -halfLength, 0, halfWidth,  // 3
        0, height, 0                // 4 (apex)
      ]);

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
      console.error("Unknown shape type:", type);
      return null;
  }

  // Create a material
  const material = new THREE.MeshPhongMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.8,
    wireframe: false,
  });

  // Create the mesh
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(scale, scale, scale);
  mesh.name = currentShape; // Assign a name for identification
  shapes.push(mesh); // Add the shape to the global shapes array

  return mesh;
}

// Helper function to retrieve a shape by name or index
export function getShapeByName(name) {
  return shapes.find(shape => shape.name === name);
}

export function getShapeByIndex(index) {
  return shapes[index];
}


const addShapeLabel = (shape, currentShape) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 128;

  context.font = 'Bold 32px Arial';
  context.fillStyle = 'white';
  context.textAlign = 'center';
  context.fillText(currentShape, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.position.y = 2;
  sprite.scale.set(2, 1, 1);
  shape.add(sprite);
};
