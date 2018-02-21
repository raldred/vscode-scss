'use strict';

import * as assert from 'assert';

import { TextDocument, CompletionItemKind } from 'vscode-languageserver';

import { ISettings } from '../../types/settings';

import { getCacheStorage } from '../../services/cache';
import { doCompletion } from '../../providers/completion';

const settings = <ISettings>{
	scannerExclude: [],
	scannerDepth: 20,
	showErrors: false,
	implicitlyLabel: '(implicitly)',
	suggestMixins: true,
	suggestVariables: true,
	suggestFunctions: true,
	suggestFunctionsInStringContextAfterSymbols: ' (+-*%'
};

function makeDocument(lines: string | string[]) {
	return TextDocument.create('test.scss', 'scss', 1, Array.isArray(lines) ? lines.join('\n') : lines);
}

const cache = getCacheStorage();

cache.set('one.scss', {
	document: 'one.scss',
	variables: [
		{ name: '$one', value: '1', offset: 0, position: null },
		{ name: '$two', value: null, offset: 0, position: null },
		{ name: '$hex', value: '#fff', offset: 0, position: null },
		{ name: '$rgb', value: 'rgb(0,0,0)', offset: 0, position: null },
		{ name: '$word', value: 'red', offset: 0, position: null }
	],
	mixins: [
		{ name: 'test', parameters: [], offset: 0, position: null }
	],
	functions: [
		{ name: 'make', parameters: [], offset: 0, position: null }
	],
	imports: []
});

describe('Providers/Completion - Basic', () => {

	it('Variables', () => {
		const doc = makeDocument('$');
		assert.equal(doCompletion(doc, 1, settings, cache).items.length, 5);
	});

	it('Mixins', () => {
		const doc = makeDocument('@include ');
		assert.equal(doCompletion(doc, 9, settings, cache).items.length, 1);
	});

});

describe('Providers/Completion - Context', () => {

	it('Empty property value', () => {
		const doc = makeDocument('.a { content:  }');
		assert.equal(doCompletion(doc, 14, settings, cache).items.length, 5);
	});

	it('Non-empty property value without suggestions', () => {
		const doc = makeDocument('.a { background: url(../images/one.png); }');
		assert.equal(doCompletion(doc, 34, settings, cache).items.length, 0);
	});

	it('Non-empty property value with Variables', () => {
		const doc = makeDocument('.a { background: url(../images/#{$one}/one.png); }');
		assert.equal(doCompletion(doc, 37, settings, cache).items.length, 5, 'True');
		assert.equal(doCompletion(doc, 42, settings, cache).items.length, 0, 'False');
	});

	it('Discard suggestions inside quotes', () => {
		const doc = makeDocument('.a { background: url("../images/#{$one}/$one.png"); @include test("test", $one); }');
		assert.equal(doCompletion(doc, 44, settings, cache).items.length, 0, 'Hide');
		assert.equal(doCompletion(doc, 38, settings, cache).items.length, 6, 'True');
		assert.equal(doCompletion(doc, 78, settings, cache).items.length, 5, 'Mixin');
	});

	it('Custom value for `suggestFunctionsInStringContextAfterSymbols` option', () => {
		const doc = makeDocument('.a { background: url(../images/m');
		const options = Object.assign(settings, <ISettings>{
			suggestFunctionsInStringContextAfterSymbols: '/'
		});
		assert.equal(doCompletion(doc, 32, options, cache).items.length, 1);
	});

	it('Discard suggestions inside single-line comments', () => {
		const doc = makeDocument('// $');
		assert.equal(doCompletion(doc, 4, settings, cache).items.length, 0);
	});

	it('Discard suggestions inside block comments', () => {
		const doc = makeDocument('/* $ */');
		assert.equal(doCompletion(doc, 4, settings, cache).items.length, 0);
	});

	it('Identify color variables', () => {
		const doc = makeDocument('$');
		const completion = doCompletion(doc, 1, settings, cache);

		assert.equal(completion.items[0].kind, CompletionItemKind.Variable);
		assert.equal(completion.items[1].kind, CompletionItemKind.Variable);
		assert.equal(completion.items[2].kind, CompletionItemKind.Color);
		assert.equal(completion.items[3].kind, CompletionItemKind.Color);
		assert.equal(completion.items[4].kind, CompletionItemKind.Color);
	});
});

describe('Providers/Completion - Implicitly', () => {

	it('Show default implicitly label', () => {
		const doc = makeDocument('$');
		assert.equal(doCompletion(doc, 1, settings, cache).items[0].detail, '(implicitly) one.scss');
	});

	it('Show custom implicitly label', () => {
		const doc = makeDocument('$');
		settings.implicitlyLabel = '👻';
		assert.equal(doCompletion(doc, 1, settings, cache).items[0].detail, '👻 one.scss');
	});

	it('Hide implicitly label', () => {
		const doc = makeDocument('$');
		settings.implicitlyLabel = null;
		assert.equal(doCompletion(doc, 1, settings, cache).items[0].detail, 'one.scss');
	});

});
