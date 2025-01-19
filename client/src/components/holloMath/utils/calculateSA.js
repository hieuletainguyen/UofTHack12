export default function calculateSurfaceArea(shape, dimensions) {
    switch (shape) {
      case 'CUBOID':
        return 2 * (
          dimensions.length * dimensions.width +
          dimensions.length * dimensions.height +
          dimensions.width * dimensions.height
        );
      case 'SPHERE':
        return 4 * Math.PI * Math.pow(dimensions.radius, 2);
      case 'CYLINDER':
        return 2 * Math.PI * dimensions.radius * dimensions.height + // lateral surface
               2 * Math.PI * Math.pow(dimensions.radius, 2);        // top and bottom circles
      case 'CONE':
        const coneSlantHeight = Math.sqrt(
          Math.pow(dimensions.height, 2) + Math.pow(dimensions.radius, 2)
        );
        return Math.PI * dimensions.radius * coneSlantHeight + // lateral surface
               Math.PI * Math.pow(dimensions.radius, 2);   // base circle
      case 'PYRAMID':
        const halfBaseLength = dimensions.baseLength / 2;
        const halfBaseWidth = dimensions.baseWidth / 2;
        const slantHeightLength = Math.sqrt(
          Math.pow(dimensions.height, 2) + Math.pow(halfBaseLength, 2)
        );
        const slantHeightWidth = Math.sqrt(
          Math.pow(dimensions.height, 2) + Math.pow(halfBaseWidth, 2)
        );
        return dimensions.baseLength * dimensions.baseWidth + // base area
               dimensions.baseLength * slantHeightWidth +    // front and back triangles
               dimensions.baseWidth * slantHeightLength;     // left and right triangles
      default:
        return 0;
    }
  };