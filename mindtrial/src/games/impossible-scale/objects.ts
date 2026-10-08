/**
 * The journey: original (mostly fictional) objects ordered by size, with a
 * few real anchors for intuition. Sizes are in metres (largest dimension).
 */
export interface ScaleObject {
  id: string;
  name: string;
  size: number;
  blurb: string;
  /** Present on checkpoint objects: shown on the guess card (no numbers!). */
  teaser?: string;
  /** Real-world anchor (not fictional). */
  real?: boolean;
}

export const OBJECTS: ScaleObject[] = [
  {
    id: "regret",
    name: "Thought-particle of regret",
    size: 1e-18,
    blurb: "The smallest unit of “I should have said something.” Decays in roughly one shower.",
  },
  {
    id: "proton",
    name: "A proton (slightly smug)",
    size: 1.7e-15,
    blurb: "Three quarks in a trench coat. Real, tiny and extremely sure of itself.",
    real: true,
  },
  {
    id: "crumb",
    name: "A quantum crumb",
    size: 2e-12,
    blurb: "Fell off a cosmic cookie. Exists in two places at once, both of them your keyboard.",
  },
  {
    id: "atom",
    name: "An atom (hydrogen, napping)",
    size: 1.06e-10,
    blurb: "About a tenth of a nanometre. Mostly empty space and good intentions.",
    teaser: "One proton, one electron, and an enormous amount of nothing in between.",
    real: true,
  },
  {
    id: "rain",
    name: "A molecule of the smell of rain",
    size: 1.2e-9,
    blurb: "Officially “petrichor”. Unofficially, the reason everyone suddenly opens a window.",
  },
  {
    id: "virus",
    name: "A virus that only infects Mondays",
    size: 1.2e-7,
    blurb: "Symptoms include sighing and a third coffee. Fully harmless by Tuesday.",
  },
  {
    id: "bacterium",
    name: "A bacterium doing yoga",
    size: 2.5e-6,
    blurb: "Rod-shaped, flexible, very centred. Real bacteria are a few micrometres long.",
    teaser: "A single living cell, holding a perfect downward dog.",
  },
  {
    id: "hat",
    name: "A dust mite’s tiny top hat",
    size: 6e-5,
    blurb: "Hand-stitched for formal occasions. The mite has never been invited to one.",
  },
  {
    id: "sand",
    name: "A grain of sand",
    size: 6e-4,
    blurb: "Half a millimetre of ground-up mountain on a very long beach holiday.",
    real: true,
  },
  {
    id: "ant",
    name: "An ant carrying a crouton",
    size: 6e-3,
    blurb: "Six legs, one crouton, zero complaints. Lifts many times its own weight in salad.",
  },
  {
    id: "cat",
    name: "A cat in loaf mode",
    size: 0.45,
    blurb: "Legs fully retracted. Maximum smugness per square centimetre.",
  },
  {
    id: "human",
    name: "A human (slightly confused)",
    size: 1.7,
    blurb: "Average height, average confusion. You are roughly this big.",
    real: true,
  },
  {
    id: "jellybean",
    name: "A blue-whale-sized jellybean",
    size: 30,
    blurb: "As long as the largest animal ever and twice as glossy. Flavour: “ocean, but sweet”.",
    teaser: "One jellybean, inflated to match the biggest animal that has ever lived.",
  },
  {
    id: "baguette",
    name: "The world’s longest baguette",
    size: 140,
    blurb: "Needs a stadium-sized oven and a very patient baker. Crunch audible from orbit.",
  },
  {
    id: "duck",
    name: "A cloud shaped like a duck",
    size: 1200,
    blurb: "Meteorologists confirm: quack-adjacent cumulus. Drifts at a leisurely waddle.",
  },
  {
    id: "everest",
    name: "Mount Everest",
    size: 8849,
    blurb: "8.8 km of rock, ice, and a surprisingly long queue at the top.",
    teaser: "The tallest mountain above sea level, measured from the sea to the summit.",
    real: true,
  },
  {
    id: "fort",
    name: "A pillow fort the size of a country",
    size: 6e5,
    blurb: "No grown-ups allowed. Diplomatic immunity guaranteed while inside.",
  },
  {
    id: "moon",
    name: "The Moon",
    size: 3.474e6,
    blurb: "3,474 km across. Has been looking for its left sock for 4.5 billion years.",
    real: true,
  },
  {
    id: "earth",
    name: "Earth",
    size: 1.2742e7,
    blurb: "12,742 km across. Home of every pizza, every cat, and every regret so far.",
    teaser: "You are here. All of here, actually.",
    real: true,
  },
  {
    id: "sun",
    name: "The Sun",
    size: 1.3927e9,
    blurb: "109 Earths wide. Please do not stare directly at the scale ruler.",
    real: true,
  },
  {
    id: "pizza",
    name: "A stack of every pizza ever eaten",
    size: 4e10,
    blurb: "Roughly a trillion pizzas at 4 cm each. Taller than the Sun is wide. Extra cheese.",
  },
  {
    id: "dyson",
    name: "A Dyson sphere around a desk lamp",
    size: 3e11,
    blurb: "Overkill? Absolutely. Perfect reading light? Also absolutely.",
  },
  {
    id: "solar",
    name: "The Solar System (out to Neptune)",
    size: 9e12,
    blurb: "About 60 AU across. Mostly very expensive empty parking.",
    real: true,
  },
  {
    id: "scarf",
    name: "A comet’s very long scarf",
    size: 1e15,
    blurb: "Knitted by the outer Solar System since before dinosaurs. Still not finished.",
  },
  {
    id: "commute",
    name: "The commute to the nearest star",
    size: 4e16,
    blurb: "4.2 light-years from the Sun to Proxima Centauri. Bring snacks. So many snacks.",
    teaser: "The trip from our Sun to its closest stellar neighbour.",
    real: true,
  },
  {
    id: "sneeze",
    name: "A nebula shaped like a sneeze",
    size: 6e17,
    blurb: "A glowing cloud where stars are born. Bless you, cosmos.",
  },
  {
    id: "disco",
    name: "A star cluster of disco balls",
    size: 1e19,
    blurb: "Globular, glittery, and booked every Saturday for the next ten billion years.",
  },
  {
    id: "soup",
    name: "A galaxy of floating soup",
    size: 9.5e20,
    blurb: "As wide as the Milky Way. The alphabet pasta spells “hello” in 11 billion places.",
    teaser: "A whole spiral galaxy, just like ours, but it’s minestrone.",
  },
  {
    id: "knit",
    name: "A galaxy group’s knitting circle",
    size: 3e22,
    blurb: "A few dozen galaxies sharing one enormous scarf project.",
  },
  {
    id: "noodles",
    name: "The cosmic web of noodles",
    size: 1e25,
    blurb: "Filaments of galaxies stretching across the void. Or spaghetti. Science is still tasting.",
  },
  {
    id: "universe",
    name: "The observable universe",
    size: 8.8e26,
    blurb: "About 93 billion light-years across. Everything we could ever see, and then the edge.",
    teaser: "Everything that light has had time to reach us from since the beginning.",
    real: true,
  },
];

export const CHECKPOINT_IDS = OBJECTS.filter((o) => o.teaser).map((o) => o.id);
