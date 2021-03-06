# Blocks

"Block" is the abstract term used to describe units of markup that, composed together, form the content or layout of a webpage. The idea combines concepts of what in WordPress today we achieve with shortcodes, custom HTML, and embed discovery into a single consistent API and user experience.

For more context, refer to [_What Are Little Blocks Made Of?_](https://make.wordpress.org/design/2017/01/25/what-are-little-blocks-made-of/) from the [Make WordPress Design](https://make.wordpress.org/design/) blog.

The following documentation outlines steps you as a developer will need to follow to add your own custom blocks to WordPress's editor interfaces.

## Installation

Install the module

```bash
npm install @wordpress/blocks --save
```

_This package assumes that your code will run in an **ES2015+** environment. If you're using an environment that has limited or no support for ES2015+ such as lower versions of IE then using [core-js](https://github.com/zloirock/core-js) or [@babel/polyfill](https://babeljs.io/docs/en/next/babel-polyfill) will add support for these methods. Learn more about it in [Babel docs](https://babeljs.io/docs/en/next/caveats)._

## Getting Started

If you're not already accustomed to working with JavaScript in your WordPress plugins, you may first want to reference the guide on [_Including CSS & JavaScript_](https://developer.wordpress.org/themes/basics/including-css-javascript/) in the Theme Handbook.

At a minimum, you will need to enqueue scripts for your block as part of a `enqueue_block_editor_assets` action callback, with a dependency on the `wp-blocks` and `wp-element` script handles:

```php
<?php
// myplugin.php

function myplugin_enqueue_block_editor_assets() {
	wp_enqueue_script(
		'myplugin-block',
		plugins_url( 'block.js', __FILE__ ),
		array( 'wp-blocks', 'wp-element' )
	);
}
add_action( 'enqueue_block_editor_assets', 'myplugin_enqueue_block_editor_assets' );
```

The `enqueue_block_editor_assets` hook is only run in the Gutenberg editor context when the editor is ready to receive additional scripts and stylesheets. There is also an `enqueue_block_assets` hook which is run under **both** the editor and front-end contexts.  This should be used to enqueue stylesheets common to the front-end and the editor.  (The rules can be overridden in the editor-specific stylesheet if necessary.)

The following sections will describe what you'll need to include in `block.js` to describe the behavior of your custom block.

Note that all JavaScript code samples in this document are enclosed in a function that is evaluated immediately afterwards.  We recommend using either ES6 modules [as used in this project](https://wordpress.org/gutenberg/handbook/reference/coding-guidelines/#imports) (documentation on setting up a plugin with Webpack + ES6 modules coming soon) or these ["immediately-invoked function expressions"](https://en.wikipedia.org/wiki/Immediately-invoked_function_expression) as used in this document.  Both of these methods ensure that your plugin's variables will not pollute the global `window` object, which could cause incompatibilities with WordPress core or with other plugins.

## Example

Let's imagine you wanted to define a block to show a randomly generated image in a post's content using [lorempixel.com](http://lorempixel.com/). The service provides a choice of category and you'd like to offer this as an option when editing the post.

Take a step back and consider the ideal workflow for adding a new random image:

-   Insert the block.  It should be shown in some empty state, with an option to choose a category in a select dropdown.
-   Upon confirming my selection, a preview of the image should be shown next to the dropdown.

At this point, you might realize that while you'd want some controls to be shown when editing content, the markup included in the published post might not appear the same (your visitors should not see a dropdown field when reading your content).

This leads to the first requirement of describing a block:

**You will need to provide implementations both for what's to be shown in an editor and what's to be saved with the published content**.

To eliminate redundant effort here, share common behaviors by splitting your code up into [components](/packages/element/README.md).

Now that we've considered user interaction, you should think about the underlying values that determine the markup generated by your block. In our example, the output is affected only when the category changes. Put another way: **the output of a block is a function of its attributes**.

The category, a simple string, is the only thing we require to be able to generate the image we want to include in the published content. We call these underlying values of a block instance its **attributes**.

With these concepts in mind, let's explore an implementation of our random image block:

```php
<?php
// random-image.php

function random_image_enqueue_block_editor_assets() {
	wp_enqueue_script(
		'random-image-block',
		plugins_url( 'block.js', __FILE__ ),
		array( 'wp-blocks', 'wp-element' )
	);
}
add_action( 'enqueue_block_editor_assets', 'random_image_enqueue_block_editor_assets' );
```

```js
// block.js
( function( blocks, element ) {
	var el = element.createElement,
		source = blocks.source;

	function RandomImage( props ) {
		var src = 'http://lorempixel.com/400/200/' + props.category;

		return el( 'img', {
			src: src,
			alt: props.category
		} );
	}

	blocks.registerBlockType( 'myplugin/random-image', {
		title: 'Random Image',

		icon: 'format-image',

		category: 'common',

		attributes: {
			category: {
				type: 'string',
				source: 'attribute',
				attribute: 'alt',
				selector: 'img',
			}
		},

		edit: function( props ) {
			var category = props.attributes.category,
				children;

			function setCategory( event ) {
				var selected = event.target.querySelector( 'option:checked' );
				props.setAttributes( { category: selected.value } );
				event.preventDefault();
			}

			children = [];
			if ( category ) {
				children.push( RandomImage( { category: category } ) );
			}

			children.push(
				el( 'select', { value: category, onChange: setCategory },
					el( 'option', null, '- Select -' ),
					el( 'option', { value: 'sports' }, 'Sports' ),
					el( 'option', { value: 'animals' }, 'Animals' ),
					el( 'option', { value: 'nature' }, 'Nature' )
				)
			);

			return el( 'form', { onSubmit: setCategory }, children );
		},

		save: function( props ) {
			return RandomImage( { category: props.attributes.category } );
		}
	} );
} )(
	window.wp.blocks,
	window.wp.element
);
```

_[(Example in ES2015+, JSX)](https://gist.github.com/aduth/fb1cc9a2296110a62b96383e4b2e8a7c)_

Let's briefly review a few items you might observe in the implementation:

-   When registering a new block, you must prefix its name with a namespace for
    your plugin. This helps prevent conflicts when more than one plugin registers
    a block with the same name.
-   You will use `createElement` to describe the structure of your block's
    markup. See the [Element documentation](/packages/element/README.md) for more
    information.
-   Extracting `RandomImage` to a separate function allows us to reuse it in both
    the editor-specific interface and the published content.
-   The `edit` function should handle any case where an attribute is unset, as in
    the case of the block being newly inserted.
-   We only change the attributes of a block by calling the `setAttributes`
    helper. Never assign a value on the attributes object directly.
-   React provides conveniences for working with `select` element with
    [`value` and `onChange` props](https://facebook.github.io/react/docs/forms.html#the-select-tag).

By concerning yourself only with describing the markup of a block given its attributes, you need not worry about maintaining the state of the page, or how your block interacts in the context of the surrounding editor.

But how does the markup become an object of attributes? We need a pattern for encoding the values into the published post's markup, and then retrieving them the next time the post is edited. This is the motivation for the block's `attributes` property. The shape of this object matches that of the attributes object we'd like to receive, where each value is a [**source**](http://github.com/aduth/hpq) which tries to find the desired value from the markup of the block.

In the random image block above, we've given the `alt` attribute of the image a secondary responsibility of tracking the selected category. There are a few other ways we could have achieved this, but the category value happens to work well as an `alt` descriptor. In the `attributes` property, we define an object with a key of `category` whose value tries to find this `alt` attribute of the markup. If it's successful, the category's value in our `edit` and `save` functions will be assigned. In the case of a new block or invalid markup, this value would be `undefined`, so we adjust our return value accordingly.

## API

<!-- START TOKEN(Autogenerated API docs) -->

### children

[src/index.js#L16-L16](src/index.js#L16-L16)

Undocumented declaration.

### cloneBlock

[src/index.js#L16-L16](src/index.js#L16-L16)

Given a block object, returns a copy of the block object, optionally merging
new attributes and/or replacing its inner blocks.

**Parameters**

-   **block** `Object`: Block instance.
-   **mergeAttributes** `Object`: Block attributes.
-   **newInnerBlocks** `?Array`: Nested blocks.

**Returns**

`Object`: A cloned block.

### createBlock

[src/index.js#L16-L16](src/index.js#L16-L16)

Returns a block object given its type and attributes.

**Parameters**

-   **name** `string`: Block name.
-   **attributes** `Object`: Block attributes.
-   **innerBlocks** `?Array`: Nested blocks.

**Returns**

`Object`: Block object.

### doBlocksMatchTemplate

[src/index.js#L16-L16](src/index.js#L16-L16)

Checks whether a list of blocks matches a template by comparing the block names.

**Parameters**

-   **blocks** `Array`: Block list.
-   **template** `Array`: Block template.

**Returns**

`boolean`: Whether the list of blocks matches a templates

### findTransform

[src/index.js#L16-L16](src/index.js#L16-L16)

Given an array of transforms, returns the highest-priority transform where
the predicate function returns a truthy value. A higher-priority transform
is one with a lower priority value (i.e. first in priority order). Returns
null if the transforms set is empty or the predicate function returns a
falsey value for all entries.

**Parameters**

-   **transforms** `Array<Object>`: Transforms to search.
-   **predicate** `Function`: Function returning true on matching transform.

**Returns**

`?Object`: Highest-priority transform candidate.

### getBlockAttributes

[src/index.js#L16-L16](src/index.js#L16-L16)

Returns the block attributes of a registered block node given its type.

**Parameters**

-   **blockTypeOrName** `(string|Object)`: Block type or name.
-   **innerHTML** `string`: Raw block content.
-   **attributes** `?Object`: Known block attributes (from delimiters).

**Returns**

`Object`: All block attributes.

### getBlockContent

[src/index.js#L16-L16](src/index.js#L16-L16)

Given a block object, returns the Block's Inner HTML markup.

**Parameters**

-   **block** `Object`: Block instance.

**Returns**

`string`: HTML.

### getBlockDefaultClassName

[src/index.js#L16-L16](src/index.js#L16-L16)

Returns the block's default classname from its name.

**Parameters**

-   **blockName** `string`: The block name.

**Returns**

`string`: The block's default class.

### getBlockMenuDefaultClassName

[src/index.js#L16-L16](src/index.js#L16-L16)

Returns the block's default menu item classname from its name.

**Parameters**

-   **blockName** `string`: The block name.

**Returns**

`string`: The block's default menu item class.

### getBlockSupport

[src/index.js#L16-L16](src/index.js#L16-L16)

Returns the block support value for a feature, if defined.

**Parameters**

-   **nameOrType** `(string|Object)`: Block name or type object
-   **feature** `string`: Feature to retrieve
-   **defaultSupports** `*`: Default value to return if not explicitly defined

**Returns**

`?*`: Block support value

### getBlockTransforms

[src/index.js#L16-L16](src/index.js#L16-L16)

Returns normal block transforms for a given transform direction, optionally
for a specific block by name, or an empty array if there are no transforms.
If no block name is provided, returns transforms for all blocks. A normal
transform object includes `blockName` as a property.

**Parameters**

-   **direction** `string`: Transform direction ("to", "from").
-   **blockTypeOrName** `(string|Object)`: Block type or name.

**Returns**

`Array`: Block transforms for direction.

### getBlockType

[src/index.js#L16-L16](src/index.js#L16-L16)

Returns a registered block type.

**Parameters**

-   **name** `string`: Block name.

**Returns**

`?Object`: Block type.

### getBlockTypes

[src/index.js#L16-L16](src/index.js#L16-L16)

Returns all registered blocks.

**Returns**

`Array`: Block settings.

### getCategories

[src/index.js#L16-L16](src/index.js#L16-L16)

Returns all the block categories.

**Returns**

`Array<Object>`: Block categories.

### getChildBlockNames

[src/index.js#L16-L16](src/index.js#L16-L16)

Returns an array with the child blocks of a given block.

**Parameters**

-   **blockName** `string`: Name of block (example: “latest-posts”).

**Returns**

`Array`: Array of child block names.

### getDefaultBlockName

[src/index.js#L16-L16](src/index.js#L16-L16)

Retrieves the default block name.

**Returns**

`?string`: Block name.

### getFreeformContentHandlerName

[src/index.js#L16-L16](src/index.js#L16-L16)

Retrieves name of block handling non-block content, or undefined if no
handler has been defined.

**Returns**

`?string`: Blog name.

### getPhrasingContentSchema

[src/index.js#L16-L16](src/index.js#L16-L16)

Get schema of possible paths for phrasing content.

**Related**

-   <https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Content_categories#Phrasing_content>

**Returns**

`Object`: Schema.

### getPossibleBlockTransformations

[src/index.js#L16-L16](src/index.js#L16-L16)

Returns an array of block types that the set of blocks received as argument
can be transformed into.

**Parameters**

-   **blocks** `Array`: Blocks array.

**Returns**

`Array`: Block types that the blocks argument can be transformed to.

### getSaveContent

[src/index.js#L16-L16](src/index.js#L16-L16)

Given a block type containing a save render implementation and attributes, returns the
static markup to be saved.

**Parameters**

-   **blockTypeOrName** `(string|Object)`: Block type or name.
-   **attributes** `Object`: Block attributes.
-   **innerBlocks** `?Array`: Nested blocks.

**Returns**

`string`: Save content.

### getSaveElement

[src/index.js#L16-L16](src/index.js#L16-L16)

Given a block type containing a save render implementation and attributes, returns the
enhanced element to be saved or string when raw HTML expected.

**Parameters**

-   **blockTypeOrName** `(string|Object)`: Block type or name.
-   **attributes** `Object`: Block attributes.
-   **innerBlocks** `?Array`: Nested blocks.

**Returns**

`(Object|string)`: Save element or raw HTML string.

### getUnregisteredTypeHandlerName

[src/index.js#L16-L16](src/index.js#L16-L16)

Retrieves name of block handling unregistered block types, or undefined if no
handler has been defined.

**Returns**

`?string`: Blog name.

### hasBlockSupport

[src/index.js#L16-L16](src/index.js#L16-L16)

Returns true if the block defines support for a feature, or false otherwise.

**Parameters**

-   **nameOrType** `(string|Object)`: Block name or type object.
-   **feature** `string`: Feature to test.
-   **defaultSupports** `boolean`: Whether feature is supported by default if not explicitly defined.

**Returns**

`boolean`: Whether block supports feature.

### hasChildBlocks

[src/index.js#L16-L16](src/index.js#L16-L16)

Returns a boolean indicating if a block has child blocks or not.

**Parameters**

-   **blockName** `string`: Name of block (example: “latest-posts”).

**Returns**

`boolean`: True if a block contains child blocks and false otherwise.

### hasChildBlocksWithInserterSupport

[src/index.js#L16-L16](src/index.js#L16-L16)

Returns a boolean indicating if a block has at least one child block with inserter support.

**Parameters**

-   **blockName** `string`: Block type name.

**Returns**

`boolean`: True if a block contains at least one child blocks with inserter support and false otherwise.

### isReusableBlock

[src/index.js#L16-L16](src/index.js#L16-L16)

Determines whether or not the given block is a reusable block. This is a
special block type that is used to point to a global block stored via the
API.

**Parameters**

-   **blockOrType** `Object`: Block or Block Type to test.

**Returns**

`boolean`: Whether the given block is a reusable block.

### isUnmodifiedDefaultBlock

[src/index.js#L16-L16](src/index.js#L16-L16)

Determines whether the block is a default block
and its attributes are equal to the default attributes
which means the block is unmodified.

**Parameters**

-   **block** `WPBlock`: Block Object

**Returns**

`boolean`: Whether the block is an unmodified default block

### isValidBlockContent

[src/index.js#L16-L16](src/index.js#L16-L16)

Returns true if the parsed block is valid given the input content. A block
is considered valid if, when serialized with assumed attributes, the content
matches the original value.

Logs to console in development environments when invalid.

**Parameters**

-   **blockTypeOrName** `(string|Object)`: Block type.
-   **attributes** `Object`: Parsed block attributes.
-   **originalBlockContent** `string`: Original block content.

**Returns**

`boolean`: Whether block is valid.

### isValidIcon

[src/index.js#L16-L16](src/index.js#L16-L16)

Function that checks if the parameter is a valid icon.

**Parameters**

-   **icon** `*`: Parameter to be checked.

**Returns**

`boolean`: True if the parameter is a valid icon and false otherwise.

### node

[src/index.js#L16-L16](src/index.js#L16-L16)

Undocumented declaration.

### normalizeIconObject

[src/index.js#L16-L16](src/index.js#L16-L16)

Function that receives an icon as set by the blocks during the registration
and returns a new icon object that is normalized so we can rely on just on possible icon structure
in the codebase.

**Parameters**

-   **icon** `(Object|string|WPElement)`: Slug of the Dashicon to be shown as the icon for the block in the inserter, or element or an object describing the icon.

**Returns**

`Object`: Object describing the icon.

### parse

[src/index.js#L16-L16](src/index.js#L16-L16)

Parses the post content with a PegJS grammar and returns a list of blocks.

**Parameters**

-   **content** `string`: The post content.

**Returns**

`Array`: Block list.

### parseWithAttributeSchema

[src/index.js#L16-L16](src/index.js#L16-L16)

Given a block's raw content and an attribute's schema returns the attribute's
value depending on its source.

**Parameters**

-   **innerHTML** `string`: Block's raw content.
-   **attributeSchema** `Object`: Attribute's schema.

**Returns**

`*`: Attribute value.

### pasteHandler

[src/index.js#L16-L16](src/index.js#L16-L16)

Converts an HTML string to known blocks. Strips everything else.

**Parameters**

-   **options.HTML** `[string]`: The HTML to convert.
-   **options.plainText** `[string]`: Plain text version.
-   **options.mode** `[string]`: Handle content as blocks or inline content. _ 'AUTO': Decide based on the content passed. _ 'INLINE': Always handle as inline content, and return string. \* 'BLOCKS': Always handle as blocks, and return array of blocks.
-   **options.tagName** `[Array]`: The tag into which content will be inserted.
-   **options.canUserUseUnfilteredHTML** `[boolean]`: Whether or not the user can use unfiltered HTML.

**Returns**

`(Array|string)`: A list of blocks or a string, depending on `handlerMode`.

### rawHandler

[src/index.js#L16-L16](src/index.js#L16-L16)

Converts an HTML string to known blocks.

**Parameters**

-   **$1.HTML** `string`: The HTML to convert.

**Returns**

`Array`: A list of blocks.

### registerBlockStyle

[src/index.js#L16-L16](src/index.js#L16-L16)

Registers a new block style variation for the given block.

**Parameters**

-   **blockName** `string`: Name of block (example: “core/latest-posts”).
-   **styleVariation** `Object`: Object containing `name` which is the class name applied to the block and `label` which identifies the variation to the user.

### registerBlockType

[src/index.js#L16-L16](src/index.js#L16-L16)

Registers a new block provided a unique name and an object defining its
behavior. Once registered, the block is made available as an option to any
editor interface where blocks are implemented.

**Parameters**

-   **name** `string`: Block name.
-   **settings** `Object`: Block settings.

**Returns**

`?WPBlock`: The block, if it has been successfully registered; otherwise `undefined`.

### serialize

[src/index.js#L16-L16](src/index.js#L16-L16)

Takes a block or set of blocks and returns the serialized post content.

**Parameters**

-   **blocks** `Array`: Block(s) to serialize.

**Returns**

`string`: The post content.

### setCategories

[src/index.js#L16-L16](src/index.js#L16-L16)

Sets the block categories.

**Parameters**

-   **categories** `Array<Object>`: Block categories.

### setDefaultBlockName

[src/index.js#L16-L16](src/index.js#L16-L16)

Assigns the default block name.

**Parameters**

-   **name** `string`: Block name.

### setFreeformContentHandlerName

[src/index.js#L16-L16](src/index.js#L16-L16)

Assigns name of block for handling non-block content.

**Parameters**

-   **blockName** `string`: Block name.

### setUnregisteredTypeHandlerName

[src/index.js#L16-L16](src/index.js#L16-L16)

Assigns name of block handling unregistered block types.

**Parameters**

-   **blockName** `string`: Block name.

### switchToBlockType

[src/index.js#L16-L16](src/index.js#L16-L16)

Switch one or more blocks into one or more blocks of the new block type.

**Parameters**

-   **blocks** `(Array|Object)`: Blocks array or block object.
-   **name** `string`: Block name.

**Returns**

`Array`: Array of blocks.

### synchronizeBlocksWithTemplate

[src/index.js#L16-L16](src/index.js#L16-L16)

Synchronize a block list with a block template.

Synchronizing a block list with a block template means that we loop over the blocks
keep the block as is if it matches the block at the same position in the template
(If it has the same name) and if doesn't match, we create a new block based on the template.
Extra blocks not present in the template are removed.

**Parameters**

-   **blocks** `Array`: Block list.
-   **template** `Array`: Block template.

**Returns**

`Array`: Updated Block list.

### unregisterBlockStyle

[src/index.js#L16-L16](src/index.js#L16-L16)

Unregisters a block style variation for the given block.

**Parameters**

-   **blockName** `string`: Name of block (example: “core/latest-posts”).
-   **styleVariationName** `string`: Name of class applied to the block.

### unregisterBlockType

[src/index.js#L16-L16](src/index.js#L16-L16)

Unregisters a block.

**Parameters**

-   **name** `string`: Block name.

**Returns**

`?WPBlock`: The previous block value, if it has been successfully unregistered; otherwise `undefined`.

### updateCategory

[src/index.js#L16-L16](src/index.js#L16-L16)

Updates a category.

**Parameters**

-   **slug** `string`: Block category slug.
-   **category** `Object`: Object containing the category properties that should be updated.

### withBlockContentContext

[src/index.js#L17-L17](src/index.js#L17-L17)

A Higher Order Component used to inject BlockContent using context to the
wrapped component.

**Returns**

`Component`: Enhanced component with injected BlockContent as prop.


<!-- END TOKEN(Autogenerated API docs) -->

<br/><br/><p align="center"><img src="https://s.w.org/style/images/codeispoetry.png?1" alt="Code is Poetry." /></p>
