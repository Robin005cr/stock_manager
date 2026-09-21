import { InventoryItem } from './models/InventoryItem.js';
import demoItems from './data/demo.json' with { type: 'json' };

export async function seedInventoryIfEmpty() {
  const count = await InventoryItem.countDocuments();
  if (count > 0) return;
  await InventoryItem.insertMany(demoItems);
  console.log('Seeded sample inventory in MongoDB');
}
