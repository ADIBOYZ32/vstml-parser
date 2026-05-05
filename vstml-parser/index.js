/**
 * vstml-parser
 * Official parser for VSTML — Video Speech Text Markup Language
 *
 * VSTML is an open markup language for AI-powered video editing.
 * It gives AI a structured language to read, write, and edit video
 * using timestamps from Whisper STT and metadata from FFmpeg —
 * without requiring any vision model or ML training.
 *
 * @version 0.1.0
 * @license MIT
 */

const { Lexer } = require('./src/lexer')
const { Parser } = require('./src/parser')
const { validate } = require('./src/validator')
const { serialize } = require('./src/serializer')

/**
 * Parse a VSTML string into an AST
 * @param {string} input - Raw VSTML text
 * @returns {object} AST document node
 *
 * @example
 * const { parse } = require('vstml-parser')
 * const ast = parse('[scene id="s1" start="0s" end="10s"][/scene]')
 */
function parse(input) {
  if (typeof input !== 'string') {
    throw new TypeError('vstml-parser: input must be a string')
  }
  const lexer = new Lexer(input)
  const tokens = lexer.tokenize()
  const parser = new Parser(tokens)
  return parser.parse()
}

/**
 * Parse and validate a VSTML string
 * @param {string} input - Raw VSTML text
 * @returns {{ ast: object, valid: boolean, errors: string[], warnings: string[] }}
 *
 * @example
 * const { parseAndValidate } = require('vstml-parser')
 * const result = parseAndValidate(vstmlString)
 * if (!result.valid) console.error(result.errors)
 */
function parseAndValidate(input) {
  const ast = parse(input)
  const { valid, errors, warnings } = validate(ast)
  return { ast, valid, errors, warnings }
}

/**
 * Convert a VSTML AST back into a formatted VSTML string
 * @param {object} ast - AST produced by parse()
 * @returns {string} Formatted VSTML text
 *
 * @example
 * const { parse, stringify } = require('vstml-parser')
 * const ast = parse(input)
 * const output = stringify(ast)
 */
function stringify(ast) {
  return serialize(ast)
}

/**
 * Query the AST for all elements matching a tag name
 * @param {object} ast - AST produced by parse()
 * @param {string} tagName - Tag to search for e.g. "cut", "scene", "word"
 * @returns {object[]} Array of matching AST nodes
 *
 * @example
 * const cuts = query(ast, 'cut')
 * const silences = query(ast, 'silence')
 */
function query(ast, tagName) {
  const results = []

  function walk(node) {
    if (!node) return
    if (node.nodeType === 'element' && node.tag === tagName) {
      results.push(node)
    }
    for (const child of node.children || []) {
      walk(child)
    }
  }

  walk(ast)
  return results
}

/**
 * Get all timestamps from a VSTML document
 * Useful for building a timeline view or verifying timing
 * @param {object} ast - AST produced by parse()
 * @returns {object[]} Array of { tag, timestamp, attributes }
 */
function getTimestamps(ast) {
  const results = []
  const TS_ATTRS = ['start', 'end', 'at', 'from', 'to']

  function walk(node) {
    if (!node) return
    if (node.nodeType === 'element') {
      for (const attr of TS_ATTRS) {
        if (node.attributes && node.attributes[attr]) {
          results.push({
            tag: node.tag,
            attribute: attr,
            timestamp: node.attributes[attr],
            seconds: parseFloat(node.attributes[attr]),
            attributes: node.attributes,
          })
        }
      }
    }
    for (const child of node.children || []) {
      walk(child)
    }
  }

  walk(ast)
  return results.sort((a, b) => a.seconds - b.seconds)
}

/**
 * Extract the full transcript from a VSTML analysis document
 * Built from [word] tags with their timestamps
 * @param {object} ast - AST produced by parse()
 * @returns {{ text: string, words: object[] }}
 */
function getTranscript(ast) {
  const words = query(ast, 'word').map(node => ({
    word: node.children.find(c => c.nodeType === 'text')?.value || '',
    timestamp: node.attributes?.t,
    seconds: parseFloat(node.attributes?.t),
  }))

  return {
    text: words.map(w => w.word).join(' '),
    words,
  }
}

/**
 * Get all edit operations from an edit-mode VSTML document
 * Returns cuts, deletes, trims, etc. sorted by timestamp
 * @param {object} ast - AST produced by parse()
 * @returns {object[]} Sorted array of edit operation nodes
 */
function getEditOperations(ast) {
  const EDIT_TAGS = ['cut', 'trim', 'delete', 'split', 'merge', 'speed', 'reverse', 'reorder']
  const ops = []

  for (const tag of EDIT_TAGS) {
    const nodes = query(ast, tag)
    for (const node of nodes) {
      const ts = node.attributes?.at || node.attributes?.from || node.attributes?.start || '0s'
      ops.push({
        operation: tag,
        attributes: node.attributes,
        timestamp: ts,
        seconds: parseFloat(ts),
      })
    }
  }

  return ops.sort((a, b) => a.seconds - b.seconds)
}

module.exports = {
  parse,
  parseAndValidate,
  stringify,
  query,
  getTimestamps,
  getTranscript,
  getEditOperations,
  // Also export internals for advanced use
  Lexer,
  Parser,
  validate,
  serialize,
}
