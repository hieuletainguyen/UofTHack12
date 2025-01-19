export default function drawHand (landmarks, isLeft, canvasRef) {
    const ctx = canvasRef.current.getContext('2d');
    const { width, height } = canvasRef.current;

    // Draw points
    landmarks.forEach((point) => {
      ctx.beginPath();
      ctx.arc(
        point.x * width,
        point.y * height,
        4,
        0,
        3 * Math.PI
      );
      ctx.fillStyle = isLeft ? '#00FF00' : '#FF0000';  // Green for left, red for right
      ctx.fill();
    });

    // Draw connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],           // thumb
      [0, 5], [5, 6], [6, 7], [7, 8],           // index finger
      [0, 9], [9, 10], [10, 11], [11, 12],      // middle finger
      [0, 13], [13, 14], [14, 15], [15, 16],    // ring finger
      [0, 17], [17, 18], [18, 19], [19, 20],    // pinky
      [0, 5], [5, 9], [9, 13], [13, 17]         // palm
    ];

    connections.forEach(([i, j]) => {
      ctx.beginPath();
      ctx.moveTo(landmarks[i].x * width, landmarks[i].y * height);
      ctx.lineTo(landmarks[j].x * width, landmarks[j].y * height);
      ctx.strokeStyle = isLeft ? '#00FF00' : '#FF0000';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };
