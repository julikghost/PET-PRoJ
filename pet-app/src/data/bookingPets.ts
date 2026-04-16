/**
 * Booking → species (multi-select): common companion / household animals in English.
 * Kept sorted A–Z for display.
 */
const BOOKING_PET_SPECIES_RAW = [
    'Alpaca',
    'Amphibian',
    'Bird',
    'Cat',
    'Chicken',
    'Chinchilla',
    'Dog',
    'Duck',
    'Ferret',
    'Fish',
    'Frog',
    'Gecko',
    'Gerbil',
    'Goat',
    'Guinea pig',
    'Hamster',
    'Hedgehog',
    'Horse',
    'Iguana',
    'Lizard',
    'Mini pig',
    'Mouse',
    'Parrot',
    'Rabbit',
    'Rat',
    'Reptile',
    'Snake',
    'Spider',
    'Sugar glider',
    'Tortoise',
    'Turtle',
];

/** Alphabetically sorted species labels (English). */
export const BOOKING_PET_SPECIES: readonly string[] = [...BOOKING_PET_SPECIES_RAW].sort((a, b) =>
    a.localeCompare(b, 'en')
);
