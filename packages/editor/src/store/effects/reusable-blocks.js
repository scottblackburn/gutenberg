/**
 * External dependencies
 */
import { uniqueId } from 'lodash';

/**
 * WordPress dependencies
 */
import {
	createBlock,
	cloneBlock,
} from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
// TODO: Ideally this would be the only dispatch in scope. This requires either
// refactoring editor actions to yielded controls, or replacing direct dispatch
// on the editor store with action creators (e.g. `REMOVE_REUSABLE_BLOCK`).
import { dispatch as dataDispatch, select } from '@wordpress/data';

/**
 * Internal dependencies
 */
import {
	__experimentalReceiveReusableBlocks as receiveReusableBlocksAction,
	__experimentalSaveReusableBlock as saveReusableBlock,
} from '../actions';
import {
	__experimentalGetReusableBlock as getReusableBlock,
} from '../selectors';

/**
 * Convert a reusable block to a static block effect handler
 *
 * @param {Object} action  action object.
 * @param {Object} store   Redux Store.
 */
export const convertBlockToStatic = ( action, store ) => {
	const state = store.getState();
	const oldBlock = select( 'core/block-editor' ).getBlock( action.clientId );
	const reusableBlock = getReusableBlock( state, oldBlock.attributes.ref );
	const referencedBlock = select( 'core/block-editor' ).getBlock( reusableBlock.clientId );
	let newBlocks;
	if ( referencedBlock.name === 'core/template' ) {
		newBlocks = referencedBlock.innerBlocks.map( ( innerBlock ) => cloneBlock( innerBlock ) );
	} else {
		newBlocks = [ cloneBlock( referencedBlock ) ];
	}
	dataDispatch( 'core/block-editor' ).replaceBlocks( oldBlock.clientId, newBlocks );
};

/**
 * Convert a static block to a reusable block effect handler
 *
 * @param {Object} action  action object.
 * @param {Object} store   Redux Store.
 */
export const convertBlockToReusable = ( action, store ) => {
	const { dispatch } = store;
	let parsedBlock;
	if ( action.clientIds.length === 1 ) {
		parsedBlock = select( 'core/block-editor' ).getBlock( action.clientIds[ 0 ] );
	} else {
		parsedBlock = createBlock(
			'core/template',
			{},
			select( 'core/block-editor' ).getBlocksByClientId( action.clientIds )
		);

		// This shouldn't be necessary but at the moment
		// we expect the content of the shared blocks to live in the blocks state.
		dataDispatch( 'core/block-editor' ).receiveBlocks( [ parsedBlock ] );
	}

	const reusableBlock = {
		id: uniqueId( 'reusable' ),
		clientId: parsedBlock.clientId,
		title: __( 'Untitled Reusable Block' ),
	};

	dispatch( receiveReusableBlocksAction( [ {
		reusableBlock,
		parsedBlock,
	} ] ) );

	dispatch( saveReusableBlock( reusableBlock.id ) );

	dataDispatch( 'core/block-editor' ).replaceBlocks(
		action.clientIds,
		createBlock( 'core/block', {
			ref: reusableBlock.id,
		} )
	);

	// Re-add the original block to the store, since replaceBlock() will have removed it
	dataDispatch( 'core/block-editor' ).receiveBlocks( [ parsedBlock ] );
};
