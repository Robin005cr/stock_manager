function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactMatch(field, value) {
  if (!value) return null;
  return { [field]: { $regex: `^${escapeRegex(value)}$`, $options: 'i' } };
}

export function buildInventoryQuery(query) {
  const clauses = [];
  const searchTerm = query.searchTerm?.trim();

  if (searchTerm) {
    const term = escapeRegex(searchTerm);
    clauses.push({
      $or: [
        { productName: { $regex: term, $options: 'i' } },
        { category: { $regex: term, $options: 'i' } },
        { company: { $regex: term, $options: 'i' } },
      ],
    });
  }

  for (const [field, value] of [
    ['measurement', query.measurement],
    ['company', query.company],
    ['category', query.category],
    ['godown', query.godown],
  ]) {
    const clause = exactMatch(field, value);
    if (clause) clauses.push(clause);
  }

  if (query.quantity !== undefined && query.quantity !== '') {
    clauses.push({ quantity: Number(query.quantity) });
  }

  if (query.date) {
    clauses.push({ dateOfLoad: query.date });
  }

  return clauses.length ? { $and: clauses } : {};
}
