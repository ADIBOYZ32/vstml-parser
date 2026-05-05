/**
 * VSTML Parser Tests
 * Run with: node test/parser.test.js
 */

const { parse, parseAndValidate, stringify, query, getTranscript, getEditOperations } = require('../index')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (e) {
    console.log(`  ❌ ${name}`)
    console.log(`     ${e.message}`)
    failed++
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed')
}

function assertEqual(a, b) {
  if (a !== b) throw new Error(`Expected "${b}" but got "${a}"`)
}

// ─── Lexer & Basic Parsing ───────────────────────────────────────────────────

console.log('\n📦 Basic Parsing\n')

test('parses a simple self-closing tag', () => {
  const ast = parse('[cut clip="c1" at="4.2s"]')
  const nodes = ast.children.filter(n => n.nodeType === 'element')
  assert(nodes.length === 1)
  assertEqual(nodes[0].tag, 'cut')
  assertEqual(nodes[0].attributes.clip, 'c1')
  assertEqual(nodes[0].attributes.at, '4.2s')
})

test('parses a tag with children', () => {
  const ast = parse('[scene id="s1" start="0s" end="10s"][clip id="c1" src="v.mp4"][/scene]')
  const scene = ast.children.find(n => n.tag === 'scene')
  assert(scene, 'scene node exists')
  assert(scene.children.length > 0, 'scene has children')
  assertEqual(scene.children[0].tag, 'clip')
})

test('parses text content inside tags', () => {
  const ast = parse('[text start="2s" end="5s"]Hello World[/text]')
  const textTag = ast.children.find(n => n.tag === 'text')
  assert(textTag, 'text tag exists')
  const textNode = textTag.children.find(c => c.nodeType === 'text')
  assert(textNode, 'text content exists')
  assertEqual(textNode.value, 'Hello World')
})

test('parses nested tags', () => {
  const input = `
    [vstml version="0.1" mode="analysis"]
      [timeline duration="30s" fps="30"]
        [scene id="s1" start="0s" end="30s"]
          [clip id="c1" src="video.mp4"]
        [/scene]
      [/timeline]
    [/vstml]
  `
  const ast = parse(input)
  const vstml = ast.children.find(n => n.tag === 'vstml')
  assert(vstml, 'vstml root exists')
  const timeline = vstml.children.find(n => n.tag === 'timeline')
  assert(timeline, 'timeline exists')
  const scene = timeline.children.find(n => n.tag === 'scene')
  assert(scene, 'scene exists')
})

test('parses multiple sibling tags', () => {
  const input = `
    [cut clip="c1" at="2s"]
    [cut clip="c1" at="5s"]
    [cut clip="c1" at="8s"]
  `
  const ast = parse(input)
  const cuts = ast.children.filter(n => n.nodeType === 'element' && n.tag === 'cut')
  assertEqual(cuts.length, 3)
})

// ─── Validation ───────────────────────────────────────────────────────────────

console.log('\n🔍 Validation\n')

test('validates a correct document', () => {
  const input = `
    [vstml version="0.1" mode="edit"]
      [timeline duration="30s" fps="30"]
      [/timeline]
    [/vstml]
  `
  const { valid, errors } = parseAndValidate(input)
  assert(valid, `Should be valid. Errors: ${errors.join(', ')}`)
})

test('catches missing required attributes', () => {
  const input = '[clip src="video.mp4"]'
  const { valid, errors } = parseAndValidate(input)
  assert(!valid, 'Should be invalid')
  assert(errors.some(e => e.includes('id')), 'Should mention missing id')
})

test('catches invalid timestamp format', () => {
  const input = '[cut clip="c1" at="4.2"]'
  const { errors } = parseAndValidate(input)
  assert(errors.some(e => e.includes('timestamp')), 'Should flag bad timestamp')
})

test('catches invalid vstml mode', () => {
  const input = '[vstml version="0.1" mode="wrong"][/vstml]'
  const { errors } = parseAndValidate(input)
  assert(errors.some(e => e.includes('mode')), 'Should flag bad mode')
})

test('warns about unknown tags', () => {
  const input = '[unknowntag foo="bar"]'
  const { warnings } = parseAndValidate(input)
  assert(warnings.some(w => w.includes('unknowntag')), 'Should warn about unknown tag')
})

// ─── Query ────────────────────────────────────────────────────────────────────

console.log('\n🔎 Query\n')

test('query finds all matching tags', () => {
  const input = `
    [scene id="s1" start="0s" end="5s"][/scene]
    [scene id="s2" start="5s" end="10s"][/scene]
    [scene id="s3" start="10s" end="15s"][/scene]
  `
  const ast = parse(input)
  const scenes = query(ast, 'scene')
  assertEqual(scenes.length, 3)
})

test('query returns empty array when no matches', () => {
  const ast = parse('[cut clip="c1" at="2s"]')
  const scenes = query(ast, 'scene')
  assertEqual(scenes.length, 0)
})

// ─── Transcript ───────────────────────────────────────────────────────────────

console.log('\n💬 Transcript Extraction\n')

test('extracts transcript from word tags', () => {
  const input = `
    [speech start="0s" end="5s"]
      [word t="0.5"]Hey[/word]
      [word t="1.0"]everyone[/word]
      [word t="1.5"]welcome[/word]
    [/speech]
  `
  const ast = parse(input)
  const { text, words } = getTranscript(ast)
  assertEqual(words.length, 3)
  assert(text.includes('Hey'), 'transcript includes Hey')
  assert(text.includes('everyone'), 'transcript includes everyone')
})

// ─── Edit Operations ──────────────────────────────────────────────────────────

console.log('\n✂️  Edit Operations\n')

test('extracts and sorts edit operations by timestamp', () => {
  const input = `
    [cut clip="c1" at="8s"]
    [delete clip="c1" from="2s" to="4s"]
    [trim clip="c1" from="0.5s" to="30s"]
  `
  const ast = parse(input)
  const ops = getEditOperations(ast)
  assert(ops.length === 3, `Expected 3 ops, got ${ops.length}`)
  assert(ops[0].seconds <= ops[1].seconds, 'ops should be sorted by timestamp')
  assert(ops[1].seconds <= ops[2].seconds, 'ops should be sorted by timestamp')
})

// ─── Stringify ────────────────────────────────────────────────────────────────

console.log('\n📝 Stringify\n')

test('stringify produces valid VSTML that can be reparsed', () => {
  const input = '[scene id="s1" start="0s" end="10s"][clip id="c1" src="v.mp4"][/scene]'
  const ast = parse(input)
  const output = stringify(ast)
  assert(typeof output === 'string', 'output is a string')
  assert(output.includes('[scene'), 'output includes scene tag')
  // Reparse to verify round-trip
  const ast2 = parse(output)
  const scene = query(ast2, 'scene')
  assert(scene.length > 0, 'reparsed AST has scene')
})

// ─── Real World Example ───────────────────────────────────────────────────────

console.log('\n🎬 Real World Example\n')

test('parses a full analysis document', () => {
  const input = `
    [vstml version="0.1" mode="analysis"]
      [timeline duration="45s" fps="30" resolution="1920x1080"]
        [scene id="s1" start="0s" end="14.3s"]
          [clip id="c1" src="take1.mp4"]
          [speech start="0.8s" end="13.1s"]
            [word t="0.8"]Hey[/word]
            [word t="1.3"]everyone[/word]
            [silence start="3.1s" end="4.9s" action="cut"]
            [filler word="um" t="5.9s" action="remove"]
            [word t="6.4"]are[/word]
          [/speech]
        [/scene]
        [scene id="s2" start="14.3s" end="45s"]
          [clip id="c2" src="take2.mp4"]
        [/scene]
      [/timeline]
    [/vstml]
  `
  const { ast, valid, errors } = parseAndValidate(input)
  assert(valid, `Should be valid. Errors: ${errors.join(', ')}`)

  const scenes = query(ast, 'scene')
  assertEqual(scenes.length, 2)

  const { words } = getTranscript(ast)
  assert(words.length > 0, 'has transcript words')

  const silences = query(ast, 'silence')
  assertEqual(silences.length, 1)
  assertEqual(silences[0].attributes.action, 'cut')
})

// ─── Results ─────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed === 0) {
  console.log('🎉 All tests passed!\n')
} else {
  console.log('⚠️  Some tests failed.\n')
  process.exit(1)
}
