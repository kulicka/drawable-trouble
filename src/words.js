const wordsByDifficulty = {
  easy: [
    // Short animals
    "cat", "dog", "fox", "owl", "bat", "bee", "ant", "pig", "hen", "ram",
    "bear", "deer", "duck", "fish", "frog", "lion", "seal", "wolf",
    "cow", "rat", "ape", "elk", "eel", "mole", "goat", "lamb", "swan", "dove",
    "crow", "hawk", "toad", "slug", "worm", "mouse", "calf", "mule", "kid",
    "jay", "gull", "sole", "moth", "fawn", "joey", "yak",
    // Body parts
    "arm", "eye", "ear", "leg", "lip", "toe", "jaw", "hip", "hand", "head",
    "foot", "hair", "nose", "knee", "neck", "chin", "thumb",
    // Clothes
    "bib", "robe", "vest", "suit", "scarf", "skirt", "dress", "jeans",
    "shirt", "pants", "gown", "belt", "coat",
    // Simple objects
    "bag", "bed", "box", "cup", "fan", "jar", "key", "map", "mug", "net",
    "pan", "pin", "bow", "axe", "hat", "pot", "rug",
    "ball", "bell", "bike", "boat", "book", "boot", "bowl", "cake", "cane",
    "card", "cart", "cave", "clam", "clay", "clip", "comb", "cone", "cord",
    "cork", "corn", "crab", "cube", "dart", "dice", "dish", "door", "drum",
    "flag", "fork", "gate", "gong", "hook", "horn", "hose", "iron",
    "kite", "knot", "lamp", "leaf", "lock", "loom", "mask", "nail", "oar",
    "pail", "pipe", "plug", "pump", "raft", "ring", "rope", "sail", "shoe",
    "sled", "sock", "tent", "tray", "tree", "tube", "vase", "vine", "wand",
    "well", "wick", "wing", "wire", "yoyo",
    "pen", "mop", "saw", "jug", "bin", "peg", "rod", "dome", "pole", "sign",
    "sink", "soap", "brick", "chain", "crown", "drill", "paint", "purse",
    "slide", "stool", "thorn", "lid", "mat", "can", "tin", "tap", "fuse",
    "pearl", "spear",
    // Simple food
    "pie", "egg", "jam", "tea", "milk", "rice", "soup", "taco",
    "bun", "ham", "nut",
    "pea", "fig", "kiwi", "plum", "pear", "salt", "tofu", "gum", "oat", "yam",
    "tart", "mint", "lime", "pita", "wheat", "honey", "bagel",
    // Vehicles
    "car", "van", "bus", "jeep", "ship", "sub", "tank",
    // Buildings
    "barn", "hut", "shed", "den",
    // Simple nature
    "sun", "sky", "sea", "ice", "mud", "bay", "star", "moon", "rain",
    "snow", "hill", "lake", "fire", "fog", "dew", "ash", "log",
    "cliff", "dune", "pond", "rose", "sand", "soil", "root", "wave", "wind",
    "tide", "moss", "oak", "palm", "weed", "mist", "peak", "rock", "hay",
    "dawn", "dusk", "ray", "rainbow",
  ],

  medium: [
    // Animals
    "eagle", "horse", "moose", "shark", "snail", "squid", "tiger", "whale",
    "beaver", "donkey", "falcon", "koala", "pelican", "penguin", "rabbit",
    "salmon", "dolphin", "gorilla", "jaguar", "lobster", "panther", "squirrel",
    "badger", "bison", "camel", "cobra", "ferret", "hamster", "hyena", "llama",
    "monkey", "ostrich", "parrot", "peacock", "raccoon", "sloth", "turkey",
    "turtle", "walrus", "weasel", "lizard", "scorpion", "spider", "beetle",
    "otter", "panda", "lemur", "vulture", "buffalo", "leopard", "cheetah",
    // Food
    "apple", "bacon", "bread", "candy", "chips", "cream", "donut", "grape",
    "juice", "lemon", "mango", "noodle", "olive", "onion", "pasta", "pizza",
    "salad", "steak", "sushi", "toast", "waffle", "banana", "carrot",
    "cheese", "cherry", "cookie", "hotdog", "muffin", "pretzel", "shrimp",
    "yogurt", "burrito",
    "brownie", "cupcake", "gelato", "kebab", "lasagna", "meatball", "omelet",
    "pancake", "pickle", "popcorn", "ravioli", "sausage", "tortilla", "churro",
    "jelly", "sundae", "syrup", "melon", "papaya", "peach", "peanut", "pumpkin",
    "almond", "coconut",
    // Household objects
    "broom", "brush", "chair", "clock", "couch", "fence", "frame", "glass",
    "glove", "knife", "pillow", "plate", "ruler", "shelf", "spoon", "sword",
    "table", "towel", "camera", "guitar", "hammer", "ladder", "mirror",
    "needle", "pencil", "wallet", "blanket", "bucket", "button", "candle",
    "carpet", "kettle", "laptop", "remote", "shield", "trophy",
    "anvil", "basket", "bottle", "drawer", "faucet", "fridge", "magnet",
    "mailbox", "radio", "razor", "saucer", "shovel", "slipper", "speaker",
    "stove", "syringe", "tongs", "vacuum", "pliers", "wrench", "scissors",
    // Sports / games
    "basketball", "baseball", "bowling", "chess", "dumbbell", "football",
    "frisbee", "helmet", "hockey", "jersey", "racket", "skates", "skateboard",
    "soccer", "tennis", "volleyball",
    // Vehicles
    "canoe", "carriage", "sailboat", "scooter", "sleigh", "taxi", "tractor",
    "trailer", "truck", "yacht",
    // Instruments
    "harp", "banjo", "drums", "flute", "piano", "violin", "cello", "organ",
    // Plants / garden
    "cactus", "daisy", "fern", "ivy", "lily", "mushroom", "pinecone", "shrub",
    "sunflower", "tulip", "watermelon",
    // Nature & places
    "beach", "cloud", "coast", "creek", "earth", "flame", "flood", "grass",
    "ocean", "river", "storm", "swamp", "forest", "island", "valley",
    "castle", "jungle", "meadow", "shadow", "spring", "sunset", "tunnel",
    "bridge", "flower", "desert",
    "comet", "galaxy", "lava", "planet", "prairie", "ridge", "stone", "sunrise",
    "twilight", "twig", "branch", "bone",
    // Misc / fun
    "ghost", "ninja", "pirate", "medal", "music", "magic", "dragon",
    "statue", "portal", "potion", "scroll", "rocket", "zombie", "goblin",
    "anchor", "compass", "lantern", "torch", "snowman", "campfire",
    "arrow", "balloon", "bubble", "feather", "nest", "pyramid", "snowflake",
    "throne", "wreath", "trumpet", "saddle",
  ],

  hard: [
    // Animals
    "flamingo", "hedgehog", "butterfly", "crocodile", "porcupine", "kangaroo",
    "octopus", "chimpanzee", "chameleon", "orangutan",
    "anaconda", "armadillo", "capybara", "jellyfish", "manatee", "narwhal",
    "salamander", "seahorse", "stingray", "tarantula", "woodpecker", "alligator",
    "mosquito", "dragonfly", "grasshopper", "platypus", "rhinoceros",
    // Food
    "avocado", "biscuit", "sandwich", "chocolate", "pineapple", "strawberry",
    "blueberry", "quesadilla", "cheesecake", "bruschetta",
    "cheeseburger", "croissant", "eggplant", "gingerbread", "macaroni",
    "mozzarella", "parmesan", "pomegranate", "raspberry", "smoothie",
    "spaghetti", "dumpling", "marshmallow",
    // Objects
    "glasses", "umbrella", "suitcase", "telescope", "envelope",
    "notebook", "matches", "parachute", "binoculars", "thermometer",
    "microscope", "calculator", "headphones",
    "stethoscope", "typewriter", "projector", "harmonica", "accordion",
    "saxophone", "xylophone", "microphone", "chandelier", "kaleidoscope",
    "periscope", "trampoline",
    // Vehicles
    "ambulance", "bulldozer", "helicopter", "motorcycle", "submarine",
    "tricycle", "unicycle", "snowmobile", "locomotive", "gondola",
    // Nature & places
    "volcano", "iceberg", "mountain", "tornado", "windmill",
    "lighthouse", "waterfall", "earthquake", "thunderstorm", "aurora",
    "archipelago",
    "peninsula", "glacier", "hailstorm", "lightning", "tundra", "observatory",
    "planetarium", "aquarium", "stalactite",
    // Structures & places
    "hospital", "cemetery", "cathedral", "laboratory", "amphitheater",
    "skyscraper", "suspension bridge",
    "museum", "university", "monastery", "coliseum",
    // Mythology / fantasy
    "unicorn", "mermaid", "werewolf", "leprechaun", "centaur", "sphinx",
    "gargoyle", "phoenix", "minotaur",
    // Misc / abstract
    "skeleton", "vampire", "treasure", "dungeon", "monster", "spaceship",
    "firework", "hourglass", "boomerang", "quicksand", "rollercoaster",
    "shipwreck", "blacksmith", "scarecrow", "tumbleweed",
    "satellite", "constellation", "mosaic", "tapestry", "fortress",
    "labyrinth", "guillotine",
  ],
};

function pickFrom(diff, excludeSet) {
  const pool = wordsByDifficulty[diff];
  const available = pool.filter(w => !excludeSet.has(w));
  const useList = available.length ? available : pool;
  return useList[Math.floor(Math.random() * useList.length)];
}

function getRandomWords(count = 3, difficulty = 'medium', exclude = []) {
  const excludeSet = new Set(exclude);

  if (difficulty === 'mixed') {
    const diffs = ['easy', 'medium', 'hard'];
    const results = [];
    for (let i = 0; i < count; i++) {
      const diff = diffs[i % diffs.length];
      const word = pickFrom(diff, excludeSet);
      results.push({ word, difficulty: diff });
      excludeSet.add(word);
    }
    return results.sort(() => Math.random() - 0.5);
  }

  const pool = wordsByDifficulty[difficulty] || wordsByDifficulty.medium;
  const unique = [...new Set(pool)];
  const available = unique.filter(w => !excludeSet.has(w));
  const useList = available.length >= count ? available : unique;
  return [...useList].sort(() => Math.random() - 0.5).slice(0, count)
    .map(word => ({ word, difficulty }));
}

module.exports = { getRandomWords };
