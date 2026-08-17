// Test runtime execution of screener.bundle.js
const fs = require('fs');
const path = require('path');

const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const jsContent = fs.readFileSync(path.join(__dirname, 'js', 'screener.bundle.js'), 'utf8');

console.log('HTML Length:', htmlContent.length);
console.log('JS Length:', jsContent.length);

console.log('Testing JS syntax and evaluation in isolated VM...');
const vm = require('vm');

// Create mock browser globals
const mockDocument = {
  readyState: 'complete',
  createElement: (tag) => ({
    getContext: () => ({
      getExtension: () => null,
      getParameter: () => null,
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      arc: () => {},
      save: () => {},
      restore: () => {},
      measureText: () => ({ width: 50 }),
      fillText: () => {},
      setLineDash: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} })
    }),
    appendChild: () => {},
    classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
    style: {},
    addEventListener: () => {},
    querySelectorAll: () => [],
    querySelector: () => null,
    setAttribute: () => {},
    getAttribute: () => null
  }),
  getElementById: (id) => {
    return {
      id,
      innerHTML: '',
      textContent: '',
      value: '10',
      checked: true,
      style: {},
      dataset: {},
      classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
      addEventListener: () => {},
      querySelectorAll: () => [],
      querySelector: () => null,
      appendChild: () => {},
      scrollIntoView: () => {},
      focus: () => {}
    };
  },
  querySelectorAll: (selector) => [],
  querySelector: (selector) => null,
  addEventListener: () => {},
  body: { style: {} }
};

const sandbox = {
  window: {
    location: { search: '' },
    addEventListener: () => {},
    removeEventListener: () => {},
    open: () => {},
    screener: null,
    devicePixelRatio: 1
  },
  document: mockDocument,
  console,
  performance: { now: () => Date.now() },
  setTimeout: (fn) => { try { fn(); } catch(e){} },
  clearTimeout: () => {},
  setInterval: () => {},
  clearInterval: () => {},
  requestAnimationFrame: (fn) => { try { fn(); } catch(e){} },
  Float32Array,
  Math,
  Date,
  Array,
  Object,
  String,
  Number,
  Boolean,
  JSON,
  URLSearchParams,
  encodeURIComponent
};
sandbox.window.document = mockDocument;

try {
  vm.createContext(sandbox);
  vm.runInContext(jsContent, sandbox);
  console.log('SUCCESS: screener.bundle.js evaluated without errors!');
  console.log('window.screener instance created:', !!sandbox.window.screener);
} catch (err) {
  console.error('RUNTIME EVALUATION ERROR:', err);
}
