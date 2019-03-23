/**
 * WordPress dependencies
 */
import { getDefaultBlockName, doBlocksMatchTemplate } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import {
	clearSelectedBlock,
	enterFormattedText,
	exitFormattedText,
	hideInsertionPoint,
	insertBlock,
	insertBlocks,
	mergeBlocks,
	multiSelect,
	removeBlock,
	removeBlocks,
	replaceBlock,
	replaceBlocks,
	replaceInnerBlocks,
	resetBlocks,
	selectBlock,
	selectPreviousBlock,
	showInsertionPoint,
	startMultiSelect,
	startTyping,
	stopMultiSelect,
	stopTyping,
	toggleBlockMode,
	toggleSelection,
	updateBlock,
	updateBlockAttributes,
	updateBlockListSettings,
	setTemplateValidity,
} from '../actions';
import { select } from '../controls';
import { STORE_KEY } from '../constants';

jest.mock( '@wordpress/blocks' );

const {
	registerBlockType,
	unregisterBlockType,
	getBlockTypes,
	createBlock,
} = jest.requireActual( '@wordpress/blocks' );

/**
 * Needed because we're mocking '@wordpress/blocks' and the implementation is
 * in the imported actions module.
 */
doBlocksMatchTemplate.mockImplementation( ( ...args ) => {
	const { doBlocksMatchTemplate: matcher } = jest.requireActual(
		'@wordpress/blocks'
	);
	return matcher( ...args );
} );

describe( 'actions', () => {
	describe( 'resetBlocks', () => {
		let fulfillment;
		const reset = ( blocks ) => fulfillment = resetBlocks( blocks );
		it( 'should yield the RESET_BLOCKS action', () => {
			const blocks = [];
			reset( blocks );
			const { value } = fulfillment.next();
			expect( value ).toEqual( {
				type: 'RESET_BLOCKS',
				blocks,
			} );
		} );
		it( 'should yield select control for getTemplate', () => {
			const { value } = fulfillment.next();
			expect( value ).toEqual(
				select(
					STORE_KEY,
					'getTemplate'
				)
			);
		} );
		it( 'should yield select control for getTemplateLock', () => {
			const { value } = fulfillment.next();
			expect( value ).toEqual(
				select(
					STORE_KEY,
					'getTemplateLock'
				)
			);
		} );
		it( 'should yield select control for isValidTemplate', () => {
			const { value } = fulfillment.next();
			expect( value ).toEqual(
				select(
					STORE_KEY,
					'isValidTemplate'
				)
			);
		} );
		describe( 'testing variations of template and template lock', () => {
			const defaultBlockSettings = {
				save: () => 'Saved',
				category: 'common',
				title: 'block title',
			};
			beforeEach( () => {
				registerBlockType( 'core/test-block', defaultBlockSettings );
			} );

			afterEach( () => {
				getBlockTypes().forEach( ( block ) => {
					unregisterBlockType( block.name );
				} );
			} );
			const rewind = ( template, templateLock, isValidTemplate ) => {
				reset( [] );
				fulfillment.next();
				fulfillment.next();
				fulfillment.next( template );
				fulfillment.next( templateLock );
				return fulfillment.next( isValidTemplate );
			};

			it( 'yields action for setTemplateValidity when there is a template ' +
				'and the blocks do not match the template and template is currently ' +
				'not valid in the state and there is no template lock', () => {
				const { value } = rewind(
					[ createBlock( 'core/test-block' ) ],
					false,
					false
				);
				expect( value ).toEqual(
					setTemplateValidity( true )
				);
			} );
			it( 'yields action for setTemplateValidity when there is a template ' +
				'and the blocks do not match the template and the template is ' +
				'currently valid in the state and there is a template lock', () => {
				const { value } = rewind(
					[ createBlock( 'core/test-block' ) ],
					'all',
					true
				);
				expect( value ).toEqual(
					setTemplateValidity( false )
				);
			} );
			it( 'does not yield setTemplateValidity when the validation matches the ' +
				'state', () => {
				const { value, done } = rewind( [], false, true );
				expect( value ).toBeUndefined();
				expect( done ).toBe( true );
			} );
		} );
	} );

	describe( 'updateBlockAttributes', () => {
		it( 'should return the UPDATE_BLOCK_ATTRIBUTES action', () => {
			const clientId = 'myclientid';
			const attributes = {};
			const result = updateBlockAttributes( clientId, attributes );
			expect( result ).toEqual( {
				type: 'UPDATE_BLOCK_ATTRIBUTES',
				clientId,
				attributes,
			} );
		} );
	} );

	describe( 'updateBlock', () => {
		it( 'should return the UPDATE_BLOCK action', () => {
			const clientId = 'myclientid';
			const updates = {};
			const result = updateBlock( clientId, updates );
			expect( result ).toEqual( {
				type: 'UPDATE_BLOCK',
				clientId,
				updates,
			} );
		} );
	} );

	describe( 'selectBlock', () => {
		it( 'should return the SELECT_BLOCK action', () => {
			const clientId = 'myclientid';
			const result = selectBlock( clientId, -1 );
			expect( result ).toEqual( {
				type: 'SELECT_BLOCK',
				initialPosition: -1,
				clientId,
			} );
		} );
	} );

	describe( 'startMultiSelect', () => {
		it( 'should return the START_MULTI_SELECT', () => {
			expect( startMultiSelect() ).toEqual( {
				type: 'START_MULTI_SELECT',
			} );
		} );
	} );

	describe( 'stopMultiSelect', () => {
		it( 'should return the Stop_MULTI_SELECT', () => {
			expect( stopMultiSelect() ).toEqual( {
				type: 'STOP_MULTI_SELECT',
			} );
		} );
	} );
	describe( 'multiSelect', () => {
		it( 'should return MULTI_SELECT action', () => {
			const start = 'start';
			const end = 'end';
			expect( multiSelect( start, end ) ).toEqual( {
				type: 'MULTI_SELECT',
				start,
				end,
			} );
		} );
	} );

	describe( 'clearSelectedBlock', () => {
		it( 'should return CLEAR_SELECTED_BLOCK action', () => {
			expect( clearSelectedBlock() ).toEqual( {
				type: 'CLEAR_SELECTED_BLOCK',
			} );
		} );
	} );

	describe( 'replaceBlocks', () => {
		const defaultBlockSettings = {
			save: () => 'Saved',
			category: 'common',
			title: 'block title',
		};
		beforeEach( () => {
			getDefaultBlockName.mockReturnValue( 'core/test-block' );
			registerBlockType( 'core/test-block', defaultBlockSettings );
		} );

		afterEach( () => {
			getDefaultBlockName.mockReset();
			getBlockTypes().forEach( ( block ) => {
				unregisterBlockType( block.name );
			} );
		} );
		let fulfillment;
		const block = { clientId: 'ribs' };
		const clientIds = [ 'chicken' ];
		const reset = () => fulfillment = replaceBlocks( clientIds, block );
		it( 'should yield the REPLACE_BLOCKS action', () => {
			reset();
			const { value } = fulfillment.next();
			expect( value ).toEqual( {
				type: 'REPLACE_BLOCKS',
				clientIds: [ 'chicken' ],
				blocks: [ block ],
				time: expect.any( Number ),
			} );
		} );
		it( 'should yield select control for getting block count', () => {
			const { value } = fulfillment.next();
			expect( value ).toEqual(
				select(
					STORE_KEY,
					'getBlockCount'
				)
			);
		} );
		it( 'should yield insertDefaultBlock action if there block count is ' +
			'0', () => {
			const { value } = fulfillment.next( 0 );
			expect( value.type ).toBe( 'INSERT_BLOCKS' );
			const { done } = fulfillment.next();
			expect( done ).toBe( true );
		} );
		it( 'should be done if the block count is greater than 0', () => {
			reset();
			fulfillment.next();
			fulfillment.next();
			const { value, done } = fulfillment.next( 1 );
			expect( value ).toBeUndefined();
			expect( done ).toBe( true );
		} );
	} );

	describe( 'replaceBlock', () => {
		it( 'should return the REPLACE_BLOCKS generator that yields ' +
			'the replaceBlocks action initially', () => {
			const replaceBlocksGenerator = replaceBlock(
				'chicken',
				{ clientId: 'ribs' }
			);
			const { value } = replaceBlocksGenerator.next();

			expect( value ).toEqual( {
				type: 'REPLACE_BLOCKS',
				clientIds: [ 'chicken' ],
				blocks: [ { clientId: 'ribs' } ],
				time: expect.any( Number ),
			} );
		} );
	} );

	describe( 'insertBlock', () => {
		it( 'should return the INSERT_BLOCKS action', () => {
			const block = {
				clientId: 'ribs',
			};
			const index = 5;
			expect( insertBlock( block, index, 'testclientid' ) ).toEqual( {
				type: 'INSERT_BLOCKS',
				blocks: [ block ],
				index,
				rootClientId: 'testclientid',
				time: expect.any( Number ),
				updateSelection: true,
			} );
		} );
	} );

	describe( 'insertBlocks', () => {
		it( 'should return the INSERT_BLOCKS action', () => {
			const blocks = [ {
				clientId: 'ribs',
			} ];
			const index = 3;
			expect( insertBlocks( blocks, index, 'testclientid' ) ).toEqual( {
				type: 'INSERT_BLOCKS',
				blocks,
				index,
				rootClientId: 'testclientid',
				time: expect.any( Number ),
				updateSelection: true,
			} );
		} );
	} );

	describe( 'showInsertionPoint', () => {
		it( 'should return the SHOW_INSERTION_POINT action', () => {
			expect( showInsertionPoint() ).toEqual( {
				type: 'SHOW_INSERTION_POINT',
			} );
		} );
	} );

	describe( 'hideInsertionPoint', () => {
		it( 'should return the HIDE_INSERTION_POINT action', () => {
			expect( hideInsertionPoint() ).toEqual( {
				type: 'HIDE_INSERTION_POINT',
			} );
		} );
	} );

	describe( 'mergeBlocks', () => {
		it( 'should return MERGE_BLOCKS action', () => {
			const firstBlockClientId = 'blockA';
			const secondBlockClientId = 'blockB';
			expect( mergeBlocks( firstBlockClientId, secondBlockClientId ) ).toEqual( {
				type: 'MERGE_BLOCKS',
				blocks: [ firstBlockClientId, secondBlockClientId ],
			} );
		} );
	} );

	describe( 'removeBlocks', () => {
		it( 'should return REMOVE_BLOCKS action', () => {
			const clientId = 'clientId';
			const clientIds = [ clientId ];

			const actions = Array.from( removeBlocks( clientIds ) );

			expect( actions ).toEqual( [
				selectPreviousBlock( clientId ),
				{
					type: 'REMOVE_BLOCKS',
					clientIds,
				},
				select(
					'core/block-editor',
					'getBlockCount',
				),
			] );
		} );
	} );

	describe( 'removeBlock', () => {
		it( 'should return REMOVE_BLOCKS action', () => {
			const clientId = 'myclientid';

			const actions = Array.from( removeBlock( clientId ) );

			expect( actions ).toEqual( [
				selectPreviousBlock( clientId ),
				{
					type: 'REMOVE_BLOCKS',
					clientIds: [ clientId ],
				},
				select(
					'core/block-editor',
					'getBlockCount',
				),
			] );
		} );

		it( 'should return REMOVE_BLOCKS action, opting out of select previous', () => {
			const clientId = 'myclientid';

			const actions = Array.from( removeBlock( clientId, false ) );

			expect( actions ).toEqual( [
				{
					type: 'REMOVE_BLOCKS',
					clientIds: [ clientId ],
				},
				select(
					'core/block-editor',
					'getBlockCount',
				),
			] );
		} );
	} );

	describe( 'toggleBlockMode', () => {
		it( 'should return TOGGLE_BLOCK_MODE action', () => {
			const clientId = 'myclientid';
			expect( toggleBlockMode( clientId ) ).toEqual( {
				type: 'TOGGLE_BLOCK_MODE',
				clientId,
			} );
		} );
	} );

	describe( 'startTyping', () => {
		it( 'should return the START_TYPING action', () => {
			expect( startTyping() ).toEqual( {
				type: 'START_TYPING',
			} );
		} );
	} );

	describe( 'stopTyping', () => {
		it( 'should return the STOP_TYPING action', () => {
			expect( stopTyping() ).toEqual( {
				type: 'STOP_TYPING',
			} );
		} );
	} );

	describe( 'enterFormattedText', () => {
		it( 'should return the ENTER_FORMATTED_TEXT action', () => {
			expect( enterFormattedText() ).toEqual( {
				type: 'ENTER_FORMATTED_TEXT',
			} );
		} );
	} );

	describe( 'exitFormattedText', () => {
		it( 'should return the EXIT_FORMATTED_TEXT action', () => {
			expect( exitFormattedText() ).toEqual( {
				type: 'EXIT_FORMATTED_TEXT',
			} );
		} );
	} );

	describe( 'toggleSelection', () => {
		it( 'should return the TOGGLE_SELECTION action with default value for isSelectionEnabled = true', () => {
			expect( toggleSelection() ).toEqual( {
				type: 'TOGGLE_SELECTION',
				isSelectionEnabled: true,
			} );
		} );

		it( 'should return the TOGGLE_SELECTION action with isSelectionEnabled = true as passed in the argument', () => {
			expect( toggleSelection( true ) ).toEqual( {
				type: 'TOGGLE_SELECTION',
				isSelectionEnabled: true,
			} );
		} );

		it( 'should return the TOGGLE_SELECTION action with isSelectionEnabled = false as passed in the argument', () => {
			expect( toggleSelection( false ) ).toEqual( {
				type: 'TOGGLE_SELECTION',
				isSelectionEnabled: false,
			} );
		} );
	} );

	describe( 'updateBlockListSettings', () => {
		it( 'should return the UPDATE_BLOCK_LIST_SETTINGS with undefined settings', () => {
			expect( updateBlockListSettings( 'chicken' ) ).toEqual( {
				type: 'UPDATE_BLOCK_LIST_SETTINGS',
				clientId: 'chicken',
				settings: undefined,
			} );
		} );

		it( 'should return the UPDATE_BLOCK_LIST_SETTINGS action with the passed settings', () => {
			expect( updateBlockListSettings( 'chicken', { chicken: 'ribs' } ) ).toEqual( {
				type: 'UPDATE_BLOCK_LIST_SETTINGS',
				clientId: 'chicken',
				settings: { chicken: 'ribs' },
			} );
		} );
	} );

	describe( 'replaceInnerBlocks', () => {
		const block = {
			clientId: 'ribs',
		};

		it( 'should return the REPLACE_INNER_BLOCKS action with default values set', () => {
			expect( replaceInnerBlocks( 'root', [ block ] ) ).toEqual( {
				type: 'REPLACE_INNER_BLOCKS',
				blocks: [ block ],
				rootClientId: 'root',
				time: expect.any( Number ),
				updateSelection: true,
			} );
		} );

		it( 'should return the REPLACE_INNER_BLOCKS action with updateSelection false', () => {
			expect( replaceInnerBlocks( 'root', [ block ], false ) ).toEqual( {
				type: 'REPLACE_INNER_BLOCKS',
				blocks: [ block ],
				rootClientId: 'root',
				time: expect.any( Number ),
				updateSelection: false,
			} );
		} );
	} );
} );
