import * as fs from 'fs';
import * as path from 'path';
import { getInitialState } from '../Frontend/src/services/storage';

const state = getInitialState();

const outPath = path.resolve(__dirname, 'seed_data.json');
fs.writeFileSync(outPath, JSON.stringify(state, null, 2), 'utf-8');
console.log('Successfully exported full seed state to:', outPath);
