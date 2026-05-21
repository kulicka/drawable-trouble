const words = [
  "apple", "banana", "castle", "dragon", "elephant",
  "forest", "guitar", "hammer", "island", "jungle",
  "kettle", "ladder", "mirror", "needle", "ocean",
  "pencil", "rabbit", "rocket", "shadow", "spider",
  "ticket", "umbrella", "volcano", "wallet", "zombie",
  "bridge", "camera", "diamond", "envelope", "flower",
  "glasses", "hospital", "iceberg", "lighthouse", "mountain",
  "notebook", "penguin", "rainbow", "sandwich", "telescope",
  "tornado", "treasure", "unicorn", "waterfall", "windmill",
];

function getRandomWords(count = 3) {
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

module.exports = { getRandomWords };
