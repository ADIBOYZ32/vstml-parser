/**
 * VSTML Validator
 * Validates a parsed VSTML AST against the spec rules
 * Returns a list of errors and warnings
 */

const VALID_TAGS = new Set([
  // Document
  'vstml', 'timeline',
  // Media
  'clip', 'audio', 'image',
  // Structure
  'scene', 'chapter', 'marker',
  // Speech
  'speech', 'word', 'silence', 'filler', 'audiospike', 'voiceover',
  // Edit operations
  'cut', 'trim', 'delete', 'split', 'merge', 'speed', 'reverse', 'reorder',
  // Text
  'text', 'caption', 'title', 'subtitle',
  // Transitions
  'transition',
  // Effects
  'effect',
  // Overlay
  'overlay', 'broll', 'pip',
  // Recursive loop
  'review', 'issue', 'correction', 'approved', 'maxpass',
])

const REQUIRED_ATTRS = {
  vstml:      ['version', 'mode'],
  timeline:   ['duration', 'fps'],
  clip:       ['id', 'src'],
  audio:      ['id', 'src'],
  scene:      ['id', 'start', 'end'],
  speech:     ['start', 'end'],
  word:       ['t'],
  silence:    ['start', 'end'],
  filler:     ['word', 't'],
  audiospike: ['at'],
  cut:        ['clip'],
  trim:       ['clip', 'from', 'to'],
  delete:     ['clip', 'from', 'to'],
  split:      ['clip', 'at'],
  text:       ['start', 'end'],
  caption:    ['at', 'duration'],
  transition: ['type'],
  effect:     ['type'],
  review:     ['pass', 'goal'],
  issue:      ['at', 'type'],
  correction: ['for_issue', 'action'],
  approved:   ['pass'],
  maxpass:    ['value'],
}

const TIMESTAMP_REGEX = /^\d+(\.\d+)?s$/

function validateTimestamp(value, tag, attr) {
  if (value && !TIMESTAMP_REGEX.test(value)) {
    return `[${tag}] attribute "${attr}" value "${value}" is not a valid timestamp. Use format like "4.2s" or "10s".`
  }
  return null
}

function validateNode(node, errors, warnings, context = {}) {
  if (node.nodeType !== 'element') return

  const tag = node.tag
  const attrs = node.attributes || {}

  // Check tag is known
  if (!VALID_TAGS.has(tag)) {
    warnings.push(`Unknown tag "[${tag}]" — not in VSTML v0.1 spec. It will be ignored by parsers.`)
  }

  // Check required attributes
  const required = REQUIRED_ATTRS[tag] || []
  for (const req of required) {
    if (!attrs[req]) {
      errors.push(`[${tag}] is missing required attribute "${req}".`)
    }
  }

  // Timestamp validation for common attributes
  const tsAttrs = ['start', 'end', 'at', 'from', 'to', 'duration']
  for (const tsAttr of tsAttrs) {
    if (attrs[tsAttr]) {
      const err = validateTimestamp(attrs[tsAttr], tag, tsAttr)
      if (err) errors.push(err)
    }
  }

  // Rule: vstml must have valid mode
  if (tag === 'vstml' && attrs.mode && !['analysis', 'edit'].includes(attrs.mode)) {
    errors.push(`[vstml] mode must be "analysis" or "edit", got "${attrs.mode}".`)
  }

  // Rule: effect must have known type
  const EFFECT_TYPES = ['colorgrade', 'blur', 'zoom', 'brightness', 'contrast', 'saturation', 'eq', 'compression', 'normalize']
  if (tag === 'effect' && attrs.type && !EFFECT_TYPES.includes(attrs.type)) {
    warnings.push(`[effect] type "${attrs.type}" is not a standard VSTML effect type.`)
  }

  // Rule: transition must have known type
  const TRANSITION_TYPES = ['cut', 'fade', 'crossdissolve', 'wipe', 'zoom', 'flash']
  if (tag === 'transition' && attrs.type && !TRANSITION_TYPES.includes(attrs.type)) {
    warnings.push(`[transition] type "${attrs.type}" is not a standard VSTML transition type.`)
  }

  // Rule: maxpass value should be a number
  if (tag === 'maxpass' && attrs.value && isNaN(Number(attrs.value))) {
    errors.push(`[maxpass] value must be a number, got "${attrs.value}".`)
  }

  // Rule: speed value format
  if (tag === 'speed' && attrs.value && !/^\d+(\.\d+)?x$/.test(attrs.value)) {
    errors.push(`[speed] value must be in format like "1.5x" or "0.5x", got "${attrs.value}".`)
  }

  // Recurse into children
  for (const child of node.children || []) {
    validateNode(child, errors, warnings, context)
  }
}

function validate(ast) {
  const errors = []
  const warnings = []

  for (const child of ast.children || []) {
    validateNode(child, errors, warnings)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

module.exports = { validate }
