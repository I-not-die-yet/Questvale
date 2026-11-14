import {readFile, stat} from 'node:fs/promises';

const invalid = () => new Error('The NVIDIA credential could not be loaded. Check NVIDIA_API_KEY or the explicitly selected credential file.');
const valid = value => typeof value === 'string' && /^nvapi-[A-Za-z0-9_-]{16,}$/.test(value) && value.length <= 1024;

export function extractNvidiaKey(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 65536) throw invalid();
  // Parse only this exact assignment. Never source/evaluate a shell file, expand
  // variables, export its contents, or load unrelated media-service credentials.
  const lines = text.split(/\r?\n/).filter(line => /^\s*(?:export\s+)?NVIDIA_API_KEY\s*=/.test(line));
  if (lines.length !== 1) throw invalid();
  const match = lines[0].match(/^\s*(?:export\s+)?NVIDIA_API_KEY\s*=\s*(?:"([^"\r\n]*)"|'([^'\r\n]*)'|([^\s#]+))\s*(?:#.*)?$/);
  const value = match && (match[1] ?? match[2] ?? match[3]);
  if (!valid(value)) throw invalid();
  return value;
}

export async function loadNvidiaKey({file, env = process.env} = {}) {
  try {
    if (file !== undefined) {
      if (typeof file !== 'string' || !file || (await stat(file)).size > 65536) throw invalid();
      return extractNvidiaKey(await readFile(file, 'utf8'));
    }
    if (!valid(env.NVIDIA_API_KEY)) throw invalid();
    return env.NVIDIA_API_KEY;
  } catch {
    // Never include underlying errors, paths, file contents or key values.
    throw invalid();
  }
}
