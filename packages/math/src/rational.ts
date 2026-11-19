/** Aniq kasr: num/den, den > 0, qisqartirilgan. Float xatolari (0.1 + 0.2) bo'lmasligi uchun bigint */
export interface Rational {
  num: bigint;
  den: bigint;
}

const abs = (n: bigint) => (n < 0n ? -n : n);

function gcd(a: bigint, b: bigint): bigint {
  let x = abs(a);
  let y = abs(b);
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}

/** den = 0 bo'lsa null */
export function rational(num: bigint, den: bigint): Rational | null {
  if (den === 0n) return null;
  const sign = den < 0n ? -1n : 1n;
  const g = gcd(num, den) || 1n;
  return { num: (sign * num) / g, den: (sign * den) / g };
}

export function add(a: Rational, b: Rational): Rational {
  return rational(a.num * b.den + b.num * a.den, a.den * b.den) as Rational;
}

export function sub(a: Rational, b: Rational): Rational {
  return add(a, { num: -b.num, den: b.den });
}

export function div(a: Rational, b: Rational): Rational | null {
  return rational(a.num * b.den, a.den * b.num);
}

/** -1, 0, 1 */
export function compare(a: Rational, b: Rational): number {
  const d = a.num * b.den - b.num * a.den;
  return d === 0n ? 0 : d < 0n ? -1 : 1;
}

export function absR(a: Rational): Rational {
  return { num: abs(a.num), den: a.den };
}
