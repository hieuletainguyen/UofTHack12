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
    const edges = new THREE.EdgesGeometry(geometry);
    const edgeLines = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
    );
    mesh.add(edgeLines);  // Add edges as a child of the mesh
    mesh.scale.set(scale, scale, scale);
    return mesh;
};

