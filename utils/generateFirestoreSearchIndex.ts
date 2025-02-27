const generateFirestoreSearchIndex = (input: string | string[]): string[] => {
  if (Array.isArray(input)) {
    // Process each string in the array and flatten the results
    const results = input.map(str => generateFirestoreSearchIndex(str));
    return [...new Set(results.flat())];
  }

  const str = input.toLowerCase().trim();
  const result: string[] = [];

  for (let i = str.length - 1; i >= 0; i--) {
    result.push(str.slice(0, i + 1));
  }

  const split = str.split(' ');

  if (split.length > 1) {
    result.push(...generateFirestoreSearchIndex(split.slice(1).join(' ')));
  }

  return [...new Set(result)];
};

export default generateFirestoreSearchIndex;
