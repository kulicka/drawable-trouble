const wordsByDifficulty = {
  easy: [
    // Short animals
    "cat", "dog", "fox", "owl", "bat", "bee", "ant", "pig", "hen", "ram",
    "bear", "deer", "duck", "fish", "frog", "lion", "seal", "wolf",
    // Simple objects
    "bag", "bed", "box", "cup", "fan", "jar", "key", "map", "mug", "net",
    "pan", "pin", "bow", "axe", "hat", "pot", "rug",
    "ball", "bell", "bike", "boat", "book", "boot", "bowl", "cake", "cane",
    "card", "cart", "cave", "clam", "clay", "clip", "comb", "cone", "cord",
    "cork", "corn", "crab", "cube", "dart", "dice", "dish", "door", "drum",
    "flag", "fork", "frog", "gate", "gong", "hook", "horn", "hose", "iron",
    "kite", "knot", "lamp", "leaf", "lock", "loom", "mask", "nail", "oar",
    "pail", "pipe", "plug", "pump", "raft", "ring", "rope", "sail", "shoe",
    "sled", "sock", "tent", "tray", "tree", "tube", "vase", "vine", "wand",
    "well", "wick", "wing", "wire", "yoyo",
    // Simple food
    "pie", "egg", "jam", "tea", "milk", "rice", "soup", "fish", "taco",
    "bun", "ham", "nut",
    // Simple nature
    "sun", "sky", "sea", "ice", "mud", "bay", "star", "moon", "rain",
    "snow", "hill", "lake", "fire", "fog", "dew", "ash", "log",
  ],

  medium: [
    // Animals
    "eagle", "horse", "moose", "shark", "snail", "squid", "tiger", "whale",
    "beaver", "donkey", "falcon", "koala", "pelican", "penguin", "rabbit",
    "salmon", "dolphin", "gorilla", "jaguar", "lobster", "panther", "squirrel",
    // Food
    "apple", "bacon", "bread", "candy", "chips", "cream", "donut", "grape",
    "juice", "lemon", "mango", "noodle", "olive", "onion", "pasta", "pizza",
    "salad", "steak", "sushi", "toast", "waffle", "banana", "carrot",
    "cheese", "cherry", "cookie", "hotdog", "muffin", "pretzel", "shrimp",
    "yogurt", "burrito",
    // Household objects
    "broom", "brush", "chair", "clock", "couch", "fence", "frame", "glass",
    "glove", "knife", "pillow", "plate", "ruler", "shelf", "spoon", "sword",
    "table", "towel", "camera", "guitar", "hammer", "ladder", "mirror",
    "needle", "pencil", "wallet", "blanket", "bucket", "button", "candle",
    "carpet", "kettle", "laptop", "remote", "shield", "trophy",
    // Nature & places
    "beach", "cloud", "coast", "creek", "earth", "flame", "flood", "grass",
    "ocean", "river", "storm", "swamp", "forest", "island", "valley",
    "castle", "jungle", "meadow", "shadow", "spring", "sunset", "tunnel",
    "bridge", "flower", "desert",
    // Misc / fun
    "ghost", "ninja", "pirate", "medal", "music", "magic", "dragon",
    "statue", "portal", "potion", "scroll", "rocket", "zombie", "goblin",
    "anchor", "compass", "lantern", "torch", "snowman", "campfire",
  ],

  hard: [
    // Animals
    "flamingo", "hedgehog", "butterfly", "crocodile", "porcupine", "kangaroo",
    "octopus", "chimpanzee", "chameleon", "orangutan",
    // Food
    "avocado", "biscuit", "sandwich", "chocolate", "pineapple", "strawberry",
    "blueberry", "quesadilla", "cheesecake", "bruschetta",
    // Objects
    "glasses", "umbrella", "suitcase", "scissors", "telescope", "envelope",
    "notebook", "matches", "parachute", "binoculars", "thermometer",
    "microscope", "calculator", "headphones",
    // Nature & places
    "volcano", "iceberg", "mountain", "rainbow", "tornado", "windmill",
    "lighthouse", "waterfall", "earthquake", "thunderstorm", "aurora",
    "archipelago",
    // Structures & places
    "hospital", "cemetery", "cathedral", "laboratory", "amphitheater",
    "skyscraper", "suspension bridge",
    // Misc / abstract
    "skeleton", "vampire", "treasure", "dungeon", "monster", "spaceship",
    "firework", "hourglass", "boomerang", "quicksand", "rollercoaster",
    "shipwreck", "blacksmith", "scarecrow", "tumbleweed",
  ],
};

function getRandomWords(count = 3, difficulty = 'medium') {
  const pool = wordsByDifficulty[difficulty] || [
    ...wordsByDifficulty.easy,
    ...wordsByDifficulty.medium,
    ...wordsByDifficulty.hard,
  ];
  const shuffled = [...new Set(pool)].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

module.exports = { getRandomWords };
