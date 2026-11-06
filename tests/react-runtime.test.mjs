import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

// The renderer validates the installed React/React DOM pair at module load.
// Builds and the Worker-only tests otherwise miss incompatible peer versions.
test('installed React and React DOM can render together',()=>{
  assert.equal(renderToStaticMarkup(createElement('p',null,'Poopurr <demo>')),
    '<p>Poopurr &lt;demo&gt;</p>');
});
