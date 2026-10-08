#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs } = require('util');
const { validateEndpoints } = require('../src/endpoints/registry');

const DEFAULT_CONFIG = path.join(__dirname, '..', 'src', 'endpoints', 'endpoints.json');
const ENDPOINT_KEYS = ['id', 'path', 'description', 'sqlTemplate', 'params'];
const PARAM_KEYS = ['name', 'required', 'maxLength'];

const USAGE = `Usage: node scripts/endpoint-manager.js <command> [options]

Commands:
  list                             List endpoints
  show <id>                        Print one endpoint as JSON
  validate                         Validate the config file without changing it
  add --file <def.json>            Add an endpoint from a JSON definition
  update <id> --file <patch.json>  Change the fields given in the JSON file
  remove <id> --yes                Remove an endpoint

Options:
  --file <path>     JSON file for add / update
  --config <path>   endpoints file (default: src/endpoints/endpoints.json)
  --dry-run         Validate and print the result without writing the file
  --yes             Confirm remove
  -h, --help        Show this help
`;

function readJson(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    throw new Error(`Cannot read ${file}: ${err.message}`);
  }
  // PowerShell 5 writes a UTF-8 BOM, which JSON.parse rejects.
  try {
    return JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch (err) {
    throw new Error(`${file} is not valid JSON: ${err.message}`);
  }
}

function loadEndpoints(file) {
  const data = readJson(file);
  if (!Array.isArray(data)) throw new Error(`${file} must contain a JSON array`);
  return data;
}

function writeEndpoints(file, endpoints) {
  // Write to a temp file and rename so a crash never leaves a half-written config.
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(endpoints, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

function checkDefinition(def) {
  if (!def || typeof def !== 'object' || Array.isArray(def)) {
    throw new Error('definition must be a JSON object');
  }
  for (const key of Object.keys(def)) {
    if (!ENDPOINT_KEYS.includes(key)) {
      throw new Error(`unknown field "${key}" (allowed: ${ENDPOINT_KEYS.join(', ')})`);
    }
  }
  if (def.description !== undefined && typeof def.description !== 'string') {
    throw new Error('description must be a string');
  }
  if (Array.isArray(def.params)) {
    for (const param of def.params) {
      if (!param || typeof param !== 'object' || Array.isArray(param)) {
        throw new Error('each params item must be a JSON object');
      }
      for (const key of Object.keys(param)) {
        if (!PARAM_KEYS.includes(key)) {
          throw new Error(`unknown param field "${key}" (allowed: ${PARAM_KEYS.join(', ')})`);
        }
      }
    }
  }
}

function readDefinition(file) {
  if (!file) throw new Error('--file <path> is required');
  const def = readJson(file);
  checkDefinition(def);
  return def;
}

function findIndex(endpoints, id) {
  const index = endpoints.findIndex((ep) => ep.id === id);
  if (index === -1) throw new Error(`No endpoint with id "${id}"`);
  return index;
}

// Pure helpers return a new array; validation and file I/O happen in commit().
function addEndpoint(endpoints, def) {
  const entry = { ...def };
  if (entry.params === undefined) entry.params = [];
  return [...endpoints, entry];
}

function updateEndpoint(endpoints, id, patch) {
  const index = findIndex(endpoints, id);
  const next = [...endpoints];
  next[index] = { ...endpoints[index], ...patch };
  return next;
}

function removeEndpoint(endpoints, id) {
  const index = findIndex(endpoints, id);
  return endpoints.filter((_, i) => i !== index);
}

function formatList(endpoints) {
  const header = ['ID', 'METHOD', 'PATH', 'PARAMS', 'DESCRIPTION'];
  const rows = endpoints.map((ep) => [
    ep.id,
    'GET',
    ep.path,
    (ep.params ?? []).map((p) => (p.required ? p.name : `${p.name}?`)).join(', ') || '-',
    ep.description ?? '',
  ]);
  const all = [header, ...rows];
  const widths = header.map((_, i) => Math.max(...all.map((row) => row[i].length)));
  return all
    .map((row) => row.map((cell, i) => cell.padEnd(widths[i])).join('  ').trimEnd())
    .join('\n');
}

function commit(file, next, { dryRun, message, preview }) {
  validateEndpoints(next);
  if (dryRun) {
    console.log(`[dry-run] ${message}; file not changed`);
    if (preview) console.log(JSON.stringify(preview, null, 2));
    return 0;
  }
  writeEndpoints(file, next);
  console.log(`${message} in ${file}`);
  console.log('Restart the server (npm start) to apply the change.');
  return 0;
}

function requireArg(args, usage) {
  if (!args[0]) throw new Error(`missing argument. Usage: ${usage}`);
  return args[0];
}

function main(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        file: { type: 'string' },
        config: { type: 'string' },
        'dry-run': { type: 'boolean' },
        yes: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
    console.error(USAGE);
    return 1;
  }

  const { values, positionals } = parsed;
  const [command, ...args] = positionals;
  if (values.help) {
    console.log(USAGE);
    return 0;
  }
  if (!command) {
    console.error(USAGE);
    return 1;
  }

  const configFile = values.config ? path.resolve(values.config) : DEFAULT_CONFIG;
  const dryRun = Boolean(values['dry-run']);

  try {
    switch (command) {
      case 'list':
        console.log(formatList(loadEndpoints(configFile)));
        return 0;

      case 'show': {
        const id = requireArg(args, 'show <id>');
        const endpoints = loadEndpoints(configFile);
        console.log(JSON.stringify(endpoints[findIndex(endpoints, id)], null, 2));
        return 0;
      }

      case 'validate':
        validateEndpoints(loadEndpoints(configFile));
        console.log(`OK: ${configFile} is valid`);
        return 0;

      case 'add': {
        const def = readDefinition(values.file);
        const next = addEndpoint(loadEndpoints(configFile), def);
        return commit(configFile, next, {
          dryRun,
          message: `Added ${def.id}`,
          preview: next[next.length - 1],
        });
      }

      case 'update': {
        const id = requireArg(args, 'update <id> --file <patch.json>');
        const patch = readDefinition(values.file);
        if (Object.keys(patch).length === 0) throw new Error('--file has no fields to update');
        const next = updateEndpoint(loadEndpoints(configFile), id, patch);
        return commit(configFile, next, {
          dryRun,
          message: `Updated ${id}`,
          preview: next.find((ep) => ep.id === (patch.id ?? id)),
        });
      }

      case 'remove': {
        const id = requireArg(args, 'remove <id> --yes');
        if (!values.yes && !dryRun) {
          throw new Error(`remove deletes "${id}" from the config; re-run with --yes to confirm`);
        }
        const next = removeEndpoint(loadEndpoints(configFile), id);
        return commit(configFile, next, { dryRun, message: `Removed ${id}` });
      }

      default:
        throw new Error(`unknown command "${command}"`);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return 1;
  }
}

module.exports = { addEndpoint, updateEndpoint, removeEndpoint, checkDefinition, formatList };

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
