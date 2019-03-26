/**
 * WordPress dependencies
 */
import {
	registerBlockType,
	unregisterBlockType,
	createBlock,
} from '@wordpress/blocks';
import { dispatch as dataDispatch, select as dataSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import {
	convertBlockToStatic,
	convertBlockToReusable,
} from '../reusable-blocks';
import {
	__experimentalConvertBlockToReusable as convertBlockToReusableAction,
	__experimentalConvertBlockToStatic as convertBlockToStaticAction,
} from '../../actions';
import reducer from '../../reducer';
import '../../..'; // Ensure store dependencies are imported via root.

jest.mock( '@wordpress/api-fetch', () => jest.fn() );

describe( 'reusable blocks effects', () => {
	beforeAll( () => {
		registerBlockType( 'core/test-block', {
			title: 'Test block',
			category: 'common',
			save: () => null,
			attributes: {
				name: { type: 'string' },
			},
		} );

		registerBlockType( 'core/block', {
			title: 'Reusable Block',
			category: 'common',
			save: () => null,
			attributes: {
				ref: { type: 'string' },
			},
		} );
	} );

	afterAll( () => {
		unregisterBlockType( 'core/test-block' );
		unregisterBlockType( 'core/block' );
	} );

	describe( 'convertBlockToStatic', () => {
		it( 'should convert a reusable block into a static block', () => {
			const associatedBlock = createBlock( 'core/block', { ref: 123 } );
			const reusableBlock = { id: 123, title: 'My cool block' };
			const parsedBlock = createBlock( 'core/test-block', { name: 'Big Bird' } );

			const state = reducer( undefined, receiveReusableBlocksAction( [ { reusableBlock, parsedBlock } ] ) );
			jest.spyOn( dataSelect( 'core/block-editor' ), 'getBlock' ).mockImplementation( ( id ) =>
				associatedBlock.clientId === id ? associatedBlock : parsedBlock
			);
			jest.spyOn( dataDispatch( 'core/block-editor' ), 'replaceBlocks' ).mockImplementation( () => {} );

			const dispatch = jest.fn();
			const store = { getState: () => state, dispatch };

			convertBlockToStatic( convertBlockToStaticAction( associatedBlock.clientId ), store );

			expect( dataDispatch( 'core/block-editor' ).replaceBlocks ).toHaveBeenCalledWith(
				associatedBlock.clientId,
				[
					expect.objectContaining( {
						name: 'core/test-block',
						attributes: { name: 'Big Bird' },
					} ),
				]
			);

			dataDispatch( 'core/block-editor' ).replaceBlocks.mockReset();
			dataSelect( 'core/block-editor' ).getBlock.mockReset();
		} );

		it( 'should convert a reusable block with nested blocks into a static block', () => {
			const associatedBlock = createBlock( 'core/block', { ref: 123 } );
			const reusableBlock = { id: 123, title: 'My cool block' };
			const parsedBlock = createBlock( 'core/test-block', { name: 'Big Bird' }, [
				createBlock( 'core/test-block', { name: 'Oscar the Grouch' } ),
				createBlock( 'core/test-block', { name: 'Cookie Monster' } ),
			] );
			const state = reducer( undefined, receiveReusableBlocksAction( [ { reusableBlock, parsedBlock } ] ) );
			jest.spyOn( dataSelect( 'core/block-editor' ), 'getBlock' ).mockImplementation( ( id ) =>
				associatedBlock.clientId === id ? associatedBlock : parsedBlock
			);
			jest.spyOn( dataDispatch( 'core/block-editor' ), 'replaceBlocks' ).mockImplementation( () => {} );

			const dispatch = jest.fn();
			const store = { getState: () => state, dispatch };

			convertBlockToStatic( convertBlockToStaticAction( associatedBlock.clientId ), store );

			expect( dataDispatch( 'core/block-editor' ).replaceBlocks ).toHaveBeenCalledWith(
				associatedBlock.clientId,
				[
					expect.objectContaining( {
						name: 'core/test-block',
						attributes: { name: 'Big Bird' },
						innerBlocks: [
							expect.objectContaining( {
								attributes: { name: 'Oscar the Grouch' },
							} ),
							expect.objectContaining( {
								attributes: { name: 'Cookie Monster' },
							} ),
						],
					} ),
				]
			);

			dataDispatch( 'core/block-editor' ).replaceBlocks.mockReset();
			dataSelect( 'core/block-editor' ).getBlock.mockReset();
		} );
	} );

	describe( 'convertBlockToReusable', () => {
		it( 'should convert a static block into a reusable block', () => {
			const staticBlock = createBlock( 'core/block', { ref: 123 } );
			jest.spyOn( dataSelect( 'core/block-editor' ), 'getBlock' ).mockImplementation( ( ) =>
				staticBlock
			);
			jest.spyOn( dataDispatch( 'core/block-editor' ), 'replaceBlocks' ).mockImplementation( () => {} );
			jest.spyOn( dataDispatch( 'core/block-editor' ), 'receiveBlocks' ).mockImplementation( () => {} );

			const dispatch = jest.fn();
			const store = { getState: () => {}, dispatch };

			convertBlockToReusable( convertBlockToReusableAction( staticBlock.clientId ), store );

			expect( dispatch ).toHaveBeenCalledWith(
				receiveReusableBlocksAction( [ {
					reusableBlock: {
						id: expect.stringMatching( /^reusable/ ),
						clientId: staticBlock.clientId,
						title: 'Untitled Reusable Block',
					},
					parsedBlock: staticBlock,
				} ] )
			);

			expect( dispatch ).toHaveBeenCalledWith(
				saveReusableBlock( expect.stringMatching( /^reusable/ ) ),
			);

			expect( dataDispatch( 'core/block-editor' ).replaceBlocks ).toHaveBeenCalledWith(
				[ staticBlock.clientId ],
				expect.objectContaining( {
					name: 'core/block',
					attributes: { ref: expect.stringMatching( /^reusable/ ) },
				} ),
			);

			expect( dataDispatch( 'core/block-editor' ).receiveBlocks ).toHaveBeenCalledWith(
				[ staticBlock ]
			);

			dataDispatch( 'core/block-editor' ).replaceBlocks.mockReset();
			dataDispatch( 'core/block-editor' ).receiveBlocks.mockReset();
			dataSelect( 'core/block-editor' ).getBlock.mockReset();
		} );
	} );
} );
