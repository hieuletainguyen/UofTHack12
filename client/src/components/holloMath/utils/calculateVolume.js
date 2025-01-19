export default function calculateVolume(shape, dimensions) {
    switch (shape) {
      case 'CUBOID':
        return dimensions.length * dimensions.width * dimensions.height;
      case 'SPHERE':
        return (4/3) * Math.PI * Math.pow(dimensions.radius, 3);
      case 'CYLINDER':
        return Math.PI * Math.pow(dimensions.radius, 2) * dimensions.height;
      case 'CONE':
        return (1/3) * Math.PI * Math.pow(dimensions.radius, 2) * dimensions.height;
      case 'PYRAMID':
        return (1/3) * dimensions.baseLength * dimensions.baseWidth * dimensions.height;
      default:
        return 0;
    }
}