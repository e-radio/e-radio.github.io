import stations from './stations';

// Match the existing genre routes, including Greek transliteration and collisions.
const transliterateGreek = (input: string) => {
  const map: Record<string, string> = {
    Α: "a", Β: "v", Γ: "g", Δ: "d", Ε: "e", Ζ: "z", Η: "i", Θ: "th", Ι: "i", Κ: "k", Λ: "l", Μ: "m",
    Ν: "n", Ξ: "x", Ο: "o", Π: "p", Ρ: "r", Σ: "s", Τ: "t", Υ: "y", Φ: "f", Χ: "ch", Ψ: "ps", Ω: "o",
    α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i", κ: "k", λ: "l", μ: "m",
    ν: "n", ξ: "x", ο: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o",
  };
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .split("")
    .map((char) => map[char] ?? char)
    .join("");
};

const baseGenreSlug = (genre: string) =>
  transliterateGreek(genre || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "other";

const counts = new Map<string, number>();
const slugs = new Map<string, string>();
for (const station of stations) {
  for (const genre of station.genres?.length ? station.genres : ['Other']) {
    const key = genre.trim() || 'Other';
    if (slugs.has(key)) continue;
    const base = baseGenreSlug(key);
    const count = (counts.get(base) || 0) + 1;
    counts.set(base, count);
    slugs.set(key, count > 1 ? `${base}-${count}` : base);
  }
}
export function genreSlug(genre: string): string {
  return slugs.get(genre.trim() || 'Other') || baseGenreSlug(genre);
}
