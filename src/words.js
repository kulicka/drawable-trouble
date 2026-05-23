const words = [
  // Animals
  "cat", "dog", "fox", "owl", "bat", "bee", "ant",
  "bear", "deer", "frog", "wolf", "duck", "fish", "lion", "seal",
  "eagle", "horse", "moose", "shark", "snail", "squid", "tiger", "whale",
  "beaver", "donkey", "falcon", "giraffe", "gorilla", "jaguar", "koala",
  "lobster", "octopus", "panther", "pelican", "penguin", "rabbit", "salmon",
  "dolphin", "elephant", "flamingo", "hedgehog", "kangaroo", "squirrel",
  "butterfly", "crocodile", "porcupine",

  // Food & drink
  "pie", "egg", "jam", "tea",
  "cake", "milk", "rice", "soup", "taco",
  "bacon", "bread", "candy", "chips", "cream", "donut", "grape", "juice",
  "lemon", "mango", "noodle", "olive", "onion", "pasta", "pizza", "salad",
  "steak", "sushi", "toast", "waffle",
  "avocado", "biscuit", "burrito", "carrot", "cheese", "cherry", "cookie",
  "hotdog", "muffin", "pretzel", "salmon", "shrimp", "yogurt",
  "sandwich", "chocolate", "pineapple", "strawberry",

  // Household & everyday objects
  "bed", "cup", "fan", "jar", "key", "map", "mug", "net", "pan", "pin",
  "bag", "box", "broom", "brush", "chair", "clock", "couch", "fence",
  "frame", "glass", "glove", "knife", "ladder", "lamp", "mirror",
  "needle", "pencil", "phone", "pillow", "plate", "ruler", "shelf",
  "spoon", "sword", "table", "towel", "wallet",
  "blanket", "bucket", "button", "candle", "carpet", "hammer", "kettle",
  "laptop", "matches", "remote", "scissors", "suitcase", "umbrella",

  // Nature & places
  "bay", "ice", "mud", "sea", "sky", "sun",
  "cave", "hill", "lake", "moon", "rain", "reef", "snow", "star", "tree",
  "beach", "cloud", "coast", "creek", "desert", "earth", "flame",
  "flood", "forest", "grass", "island", "ocean", "river", "storm",
  "swamp", "valley", "bridge", "canyon", "castle", "flower", "jungle",
  "meadow", "shadow", "spring", "sunset", "tunnel", "volcano",
  "glacier", "iceberg", "lagoon", "lighthouse", "mountain", "rainbow",
  "waterfall", "windmill",

  // Transport & adventure
  "bus", "car", "jet", "van",
  "bike", "boat", "ship", "tank", "tram", "yacht",
  "blimp", "canoe", "ferry", "plane", "rocket", "train", "truck",
  "anchor", "compass", "engine", "helmet", "parachute", "telescope",

  // Misc / fun
  "ace", "coin", "drum", "flag", "gift", "gold", "harp", "kite",
  "lantern", "magic", "medal", "music", "pearl", "photo", "pirate",
  "portal", "potion", "puzzle", "quill", "scroll", "spell", "stage",
  "statue", "ticket", "torch", "tower", "trophy", "wand",
  "campfire", "diamond", "dragon", "dungeon", "ghost", "goblin",
  "monster", "ninja", "skeleton", "snowman", "tornado", "treasure",
  "unicorn", "vampire", "zombie",
  "cemetery", "envelope", "firework", "glasses", "hospital", "notebook",
  "sandwich", "spaceship",
];

// Deduplicate just in case
const uniqueWords = [...new Set(words)];

function getRandomWords(count = 3) {
  const shuffled = [...uniqueWords].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

module.exports = { getRandomWords };
