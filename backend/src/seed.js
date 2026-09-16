import { InventoryItem } from './models/InventoryItem.js';

const sampleItems = [
  {
    measurement: '2 kg',
    productName: 'Apple Juice',
    company: 'Fresh Farms',
    category: 'Beverages',
    quantity: 25,
    godown: 'A1',
    dateOfLoad: '2026-08-01',
  },
  {
    measurement: '500 ml',
    productName: 'Mineral Water',
    company: 'Pure Springs',
    category: 'Beverages',
    quantity: 100,
    godown: 'B2',
    dateOfLoad: '2026-08-04',
  },
  {
    measurement: '10 pcs',
    productName: 'LED Bulb',
    company: 'BrightTech',
    category: 'Electronics',
    quantity: 50,
    godown: 'C3',
    dateOfLoad: '2026-07-30',
  },
  {
    measurement: '3 kg',
    productName: 'Tomato Sauce',
    company: 'KitchenPro',
    category: 'Condiments',
    quantity: 40,
    godown: 'A2',
    dateOfLoad: '2026-08-02',
  },
];

export async function seedInventoryIfEmpty() {
  const count = await InventoryItem.countDocuments();
  if (count > 0) return;
  await InventoryItem.insertMany(sampleItems);
  console.log('Seeded sample inventory in MongoDB');
}
