import * as THREE from 'three';

const createSectorGeometry = (radius, angle) => {
  const shape = new THREE.Shape();
  const segments = 32;
  const angleRad = angle * (Math.PI / 180);
  
  // Move to center
  shape.moveTo(0, 0);
  
  // Draw first line
  shape.lineTo(radius, 0);
  
  // Draw arc
  const segments_1 = segments - 1;
  for (let i = 1; i <= segments_1; i++) {
    const theta = (i / segments) * angleRad;
    shape.lineTo(
      radius * Math.cos(theta),
      radius * Math.sin(theta)
    );
  }
  
  // Close shape
  shape.lineTo(0, 0);
  
  return new THREE.ShapeGeometry(shape);
};

export default function create2DNet(type, shapeDimensions, scale) {
    // Function to create textured material with area label
    const createTexturedMaterial = (width, height, area) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 512;
      canvas.height = 512;
      
      // Draw shape background with brighter green
      context.fillStyle = '#50FF50';  // Brighter green color
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add grid lines for visual reference
      context.strokeStyle = 'rgba(255, 255, 255, 0.2)';  // More visible grid
      context.lineWidth = 2;
      const gridSize = 32;
      for (let i = 0; i <= canvas.width; i += gridSize) {
        context.beginPath();
        context.moveTo(i, 0);
        context.lineTo(i, canvas.height);
        context.stroke();
        context.beginPath();
        context.moveTo(0, i);
        context.lineTo(canvas.width, i);
        context.stroke();
      }
      
      // Draw area text with scale
      context.font = 'Bold 64px Arial';
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      context.lineWidth = 4;
      const scaledArea = area * Math.pow(scale, 2);  // Scale the area
      const text = `Area: ${scaledArea.toFixed(1)}`;
      context.strokeText(text, canvas.width/2, canvas.height/2);
      context.fillText(text, canvas.width/2, canvas.height/2);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      
      return new THREE.MeshPhongMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
    };

    const group = new THREE.Group();

    switch (type) {
      case 'CUBOID': {
        // Calculate different face areas
        const frontBackArea = shapeDimensions.length * shapeDimensions.height;
        const leftRightArea = shapeDimensions.width * shapeDimensions.height;
        const topBottomArea = shapeDimensions.length * shapeDimensions.width;

        // Create materials for different faces
        const frontBackMaterial = createTexturedMaterial(
          shapeDimensions.length,
          shapeDimensions.height,
          frontBackArea
        );
        const leftRightMaterial = createTexturedMaterial(
          shapeDimensions.width,
          shapeDimensions.height,
          leftRightArea
        );
        const topBottomMaterial = createTexturedMaterial(
          shapeDimensions.length,
          shapeDimensions.width,
          topBottomArea
        );

        const faces = [
          // Front and back faces (length × height)
          { position: [0, 0, 0], rotation: [0, 0, 0], material: frontBackMaterial, 
            dimensions: [shapeDimensions.length, shapeDimensions.height] },
          { position: [4, 0, 0], rotation: [0, Math.PI, 0], material: frontBackMaterial,
            dimensions: [shapeDimensions.length, shapeDimensions.height] },
          
          // Left and right faces (width × height)
          { position: [-2, 0, 0], rotation: [0, Math.PI/2, 0], material: leftRightMaterial,
            dimensions: [shapeDimensions.width, shapeDimensions.height] },
          { position: [2, 0, 0], rotation: [0, -Math.PI/2, 0], material: leftRightMaterial,
            dimensions: [shapeDimensions.width, shapeDimensions.height] },
          
          // Top and bottom faces (length × width)
          { position: [0, 2, 0], rotation: [-Math.PI/2, 0, 0], material: topBottomMaterial,
            dimensions: [shapeDimensions.length, shapeDimensions.width] },
          { position: [0, -2, 0], rotation: [Math.PI/2, 0, 0], material: topBottomMaterial,
            dimensions: [shapeDimensions.length, shapeDimensions.width] }
        ];

        faces.forEach(face => {
          const planeGeometry = new THREE.PlaneGeometry(face.dimensions[0], face.dimensions[1]);
          const plane = new THREE.Mesh(planeGeometry, face.material);
          
          // Add edges to the plane
          const edges = new THREE.EdgesGeometry(planeGeometry);
          const edgeLines = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
          );
          plane.add(edgeLines);  // Add edges as a child of the plane
          
          plane.position.set(...face.position);
          plane.rotation.set(...face.rotation);
          group.add(plane);
        });
        break;
      }

      case 'CYLINDER': {
        const lateralArea = 2 * Math.PI * shapeDimensions.radius * shapeDimensions.height;
        const circleArea = Math.PI * Math.pow(shapeDimensions.radius, 2);

        // Create cylinder body with texture (rectangle)
        const bodyMaterial = createTexturedMaterial(
          2 * Math.PI * shapeDimensions.radius,
          shapeDimensions.height,
          lateralArea
        );
        const cylinderBody = new THREE.Mesh(
          new THREE.PlaneGeometry(
            2 * Math.PI * shapeDimensions.radius,
            shapeDimensions.height
          ),
          bodyMaterial
        );
        // Move the rectangle up
        cylinderBody.position.set(0, shapeDimensions.height/2, 0);
        group.add(cylinderBody);

        // Create top and bottom circles with textures
        const circleMaterial = createTexturedMaterial(
          shapeDimensions.radius * 2,
          shapeDimensions.radius * 2,
          circleArea
        );
        
        // Add spacing based on radius and a fixed gap
        const spacing = shapeDimensions.radius * 2 + 1;
        
        const topCircle = new THREE.Mesh(
          new THREE.CircleGeometry(shapeDimensions.radius, 32),
          circleMaterial
        );
        const bottomCircle = new THREE.Mesh(
          new THREE.CircleGeometry(shapeDimensions.radius, 32),
          circleMaterial
        );
        
        // Position circles with more spacing
        topCircle.position.set(0, shapeDimensions.height * 2, 0);
        bottomCircle.position.set(0, -shapeDimensions.height, 0);
        
        // Add edges to the circles
        const topCircleEdges = new THREE.EdgesGeometry(topCircle.geometry);
        const topCircleLines = new THREE.LineSegments(
          topCircleEdges,
          new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
        );
        topCircle.add(topCircleLines);
        
        const bottomCircleEdges = new THREE.EdgesGeometry(bottomCircle.geometry);
        const bottomCircleLines = new THREE.LineSegments(
          bottomCircleEdges,
          new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
        );
        bottomCircle.add(bottomCircleLines);
        
        group.add(topCircle);
        group.add(bottomCircle);
        break;
      }

      case 'CONE': {
        // Calculate areas
        const slantHeight = Math.sqrt(
          Math.pow(shapeDimensions.height, 2) + Math.pow(shapeDimensions.radius, 2)
        );
        const arcLength = 2 * Math.PI * shapeDimensions.radius;
        const sectorAngle = (arcLength / slantHeight) * (180 / Math.PI);

        // Create the sector (lateral surface)
        const sectorMaterial = createTexturedMaterial(
          arcLength,
          slantHeight,
          Math.PI * shapeDimensions.radius * slantHeight
        );
        const sector = new THREE.Mesh(
          createSectorGeometry(slantHeight, sectorAngle),
          sectorMaterial
        );
        
        // Position sector above the base
        sector.position.set(0, shapeDimensions.height/2 + shapeDimensions.radius, 0);
        group.add(sector);

        // Create base circle
        const circleMaterial = createTexturedMaterial(
          shapeDimensions.radius * 2,
          shapeDimensions.radius * 2,
          Math.PI * Math.pow(shapeDimensions.radius, 2)
        );
        const baseCircle = new THREE.Mesh(
          new THREE.CircleGeometry(shapeDimensions.radius, 32),
          circleMaterial
        );
        
        // Position base circle below the sector
        baseCircle.position.set(0, -shapeDimensions.height/2, 0);
        group.add(baseCircle);

        // Add edges to the base circle
        const baseCircleEdges = new THREE.EdgesGeometry(baseCircle.geometry);
        const baseCircleLines = new THREE.LineSegments(
          baseCircleEdges,
          new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
        );
        baseCircle.add(baseCircleLines);

        break;
      }

      case 'PYRAMID': {
        // Calculate areas
        const baseArea = shapeDimensions.baseLength * shapeDimensions.baseWidth;
        const slantHeightFront = Math.sqrt(
          Math.pow(shapeDimensions.height, 2) + Math.pow(shapeDimensions.baseWidth/2, 2)
        );
        const slantHeightSide = Math.sqrt(
          Math.pow(shapeDimensions.height, 2) + Math.pow(shapeDimensions.baseLength/2, 2)
        );
        const triangleAreaFront = shapeDimensions.baseLength * slantHeightFront / 2;
        const triangleAreaSide = shapeDimensions.baseWidth * slantHeightSide / 2;

        // Create materials for each face type
        const baseMaterial = createTexturedMaterial(
          shapeDimensions.baseLength,
          shapeDimensions.baseWidth,
          baseArea
        );
        const triangleMaterialFront = createTexturedMaterial(
          shapeDimensions.baseLength,
          shapeDimensions.height,
          triangleAreaFront
        );
        const triangleMaterialSide = createTexturedMaterial(
          shapeDimensions.baseWidth,
          shapeDimensions.height,
          triangleAreaSide
        );

        // Create base
        const base = new THREE.Mesh(
          new THREE.PlaneGeometry(shapeDimensions.baseLength, shapeDimensions.baseWidth),
          baseMaterial
        );
        base.rotation.x = -Math.PI/2;
        base.position.set(0, -shapeDimensions.height/2, 0);

        // Create triangular faces with proper geometry
        const createTriangle = (width, height) => {
          const shape = new THREE.Shape();
          shape.moveTo(-width/2, 0);
          shape.lineTo(width/2, 0);
          shape.lineTo(0, height);
          shape.lineTo(-width/2, 0);
          return new THREE.ShapeGeometry(shape);
        };

        // Position triangles around base
        const triangles = [
          {
            geometry: createTriangle(shapeDimensions.baseLength, shapeDimensions.height),
            material: triangleMaterialFront,
            position: [0, 0, shapeDimensions.baseWidth/2],
            rotation: [0, 0, 0]
          },
          {
            geometry: createTriangle(shapeDimensions.baseLength, shapeDimensions.height),
            material: triangleMaterialFront,
            position: [0, 0, -shapeDimensions.baseWidth/2],
            rotation: [0, Math.PI, 0]
          },
          {
            geometry: createTriangle(shapeDimensions.baseWidth, shapeDimensions.height),
            material: triangleMaterialSide,
            position: [shapeDimensions.baseLength/2, 0, 0],
            rotation: [0, -Math.PI/2, 0]
          },
          {
            geometry: createTriangle(shapeDimensions.baseWidth, shapeDimensions.height),
            material: triangleMaterialSide,
            position: [-shapeDimensions.baseLength/2, 0, 0],
            rotation: [0, Math.PI/2, 0]
          }
        ];

        triangles.forEach(({ geometry, material, position, rotation }) => {
          const triangle = new THREE.Mesh(geometry, material);
          triangle.position.set(...position);
          triangle.rotation.set(...rotation);
          group.add(triangle);
        });

        group.add(base);
        break;
      }

      case 'SPHERE': {
        // For sphere, create a UV mapping (like a world map)
        const sphereArea = 4 * Math.PI * Math.pow(shapeDimensions.radius, 2);
        const material = createTexturedMaterial(
          Math.PI * shapeDimensions.radius * 2,
          Math.PI * shapeDimensions.radius,
          sphereArea
        );

        const segments = 8;
        const rows = 4;
        const width = Math.PI * shapeDimensions.radius * 2 / segments;
        const height = Math.PI * shapeDimensions.radius / rows;

        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < segments; j++) {
            const panel = new THREE.Mesh(
              new THREE.PlaneGeometry(width, height),
              material
            );
            
            panel.position.set(
              (j - segments/2) * width,
              (i - rows/2) * height,
              0
            );
            
            group.add(panel);
          }
        }
        break;
      }
    }

    group.scale.set(scale, scale, scale);
    return group;
};