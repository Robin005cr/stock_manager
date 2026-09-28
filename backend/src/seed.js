import bcrypt from 'bcryptjs';
import { InventoryItem } from './models/InventoryItem.js';
import { User } from './models/User.js';
import demoItems from './data/demo.json' with { type: 'json' };

const defaultAccounts = [
  { email: 'admin@gmail.com', password: 'Password1@', role: 'admin' },
  { email: 'viewer@gmail.com', password: 'Password2@', role: 'viewer' },
];

export async function seedDefaultUsersIfMissing() {
  for (const account of defaultAccounts) {
    const exists = await User.exists({ email: account.email });
    if (exists) continue;

    const passwordHash = await bcrypt.hash(account.password, 10);
    await User.create({ email: account.email, passwordHash, role: account.role });
  }
}

export async function seedInventoryIfEmpty() {
  const count = await InventoryItem.countDocuments();
  if (count > 0) return;
  await InventoryItem.insertMany(demoItems);
  console.log('Seeded sample inventory in MongoDB');
}
