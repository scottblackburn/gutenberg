/**
 * WordPress dependencies
 */
import { Component } from '@wordpress/element';
import { Placeholder, Spinner, Disabled } from '@wordpress/components';
import {
	withSelect,
	withDispatch,
	withRegistry,
	RegistryProvider,
	createRegistry,
	plugins,
} from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import {
	BlockList,
	storeConfig as blockEditorStoreConfig,
} from '@wordpress/block-editor';
import {
	EditorProvider,
	storeConfig as editorStoreConfig,
} from '@wordpress/editor';
import { compose } from '@wordpress/compose';

/**
 * Internal dependencies
 */
import ReusableBlockEditPanel from './edit-panel';
import ReusableBlockIndicator from './indicator';
import SelectionObserver from './selection-observer';

class ReusableBlockEdit extends Component {
	constructor( props ) {
		super( ...arguments );

		this.startEditing = () => this.toggleIsEditing( true );
		this.stopEditing = () => this.toggleIsEditing( false );
		this.cancelEditing = this.cancelEditing.bind( this );
		this.onSelectedBlockChange = this.onSelectedBlockChange.bind( this );
		this.onInnerBlockSelected = this.onInnerBlockSelected.bind( this );

		this.registry = createRegistry( undefined, props.registry );
		this.registry.use( plugins.controls );
		this.registry.registerStore( 'core/block-editor', blockEditorStoreConfig );
		this.registry.registerStore( 'core/editor', editorStoreConfig );

		this.state = {
			cancelIncrementKey: 0,
			// TODO: Check if this needs to consider reusable block being temporary (this was in original PR)
			isEditing: false,
		};
	}

	componentDidUpdate( prevProps ) {
		const hasBlockSelectionChanged = (
			this.props.blockSelectionStart !== prevProps.blockSelectionStart ||
			this.props.blockSelectionEnd !== prevProps.blockSelectionEnd
		);

		if ( hasBlockSelectionChanged ) {
			this.onSelectedBlockChange();
		}
	}

	/**
	 * Handles the case that the selection of the editor in which the reusable
	 * block is rendered has changed. When this occurs, it's either a result of
	 * selection changing to a block in the embedded editor, or that selection
	 * has changed outside the reusable block. In the latter case, it must be
	 * communicated to the embedded editor to clear its own selection.
	 */
	onSelectedBlockChange() {
		if ( this.isSelectingInnerBlock ) {
			delete this.isSelectingInnerBlock;
		} else {
			this.registry.dispatch( 'core/block-editor' ).clearSelectedBlock();
		}
	}

	/**
	 * Clears any selection from the editing context of the reusable block, to
	 * ensure that only one block is selected at a time, regardless of whether
	 * it occurs in an embedded editor or its ancestor.
	 */
	onInnerBlockSelected() {
		// Since this will unselect the reusable block itself, thus triggering
		// `onSelectedBlockChange`, store a temporary value which avoids the
		// inner block otherwise becoming immediately unselected.
		this.isSelectingInnerBlock = true;

		this.props.clearSelectedBlock();
	}

	/**
	 * Starts or stops editing, corresponding to the given boolean value.
	 *
	 * @param {boolean} isEditing Whether editing mode should be made active.
	 */
	toggleIsEditing( isEditing ) {
		this.setState( { isEditing } );
	}

	/**
	 * Stops editing and restores the reusable block to its original saved
	 * state.
	 */
	cancelEditing() {
		this.stopEditing();

		// Cancelling takes effect by assigning a new key for the rendered
		// EditorProvider which forces a re-mount to reset editing state.
		let { cancelIncrementKey } = this.state;
		cancelIncrementKey++;
		this.setState( { cancelIncrementKey } );
	}

	render() {
		const {
			isSelected,
			reusableBlock,
			isFetching,
			canUpdateBlock,
			settings,
		} = this.props;
		const { cancelIncrementKey, isEditing } = this.state;

		if ( ! reusableBlock ) {
			return (
				<Placeholder>
					{
						isFetching ?
							<Spinner /> :
							__( 'Block has been deleted or is unavailable.' )
					}
				</Placeholder>
			);
		}

		let list = <BlockList />;
		if ( ! isEditing ) {
			list = <Disabled>{ list }</Disabled>;
		}

		return (
			<RegistryProvider value={ this.registry }>
				<EditorProvider
					key={ cancelIncrementKey }
					post={ reusableBlock }
					settings={ { ...settings, templateLock: ! isEditing } }
				>
					<SelectionObserver onBlockSelected={ this.onInnerBlockSelected } />
					{ ( isSelected || isEditing ) && (
						<ReusableBlockEditPanel
							isEditing={ isEditing }
							isEditDisabled={ ! canUpdateBlock }
							onEdit={ this.startEditing }
							onSave={ this.stopEditing }
							onCancel={ this.cancelEditing }
						/>
					) }
					{ ! isSelected && ! isEditing && (
						<ReusableBlockIndicator title={ reusableBlock.title } />
					) }
					{ list }
				</EditorProvider>
			</RegistryProvider>
		);
	}
}

export default compose( [
	withRegistry,
	withSelect( ( select, ownProps ) => {
		const { ref } = ownProps.attributes;
		const { canUser, getEntityRecord } = select( 'core' );
		const { isResolving } = select( 'core/data' );
		const { getEditorSettings } = select( 'core/editor' );
		const {
			getBlockSelectionStart,
			getBlockSelectionEnd,
		} = select( 'core/block-editor' );

		const isTemporaryReusableBlock = ! Number.isFinite( ref );

		let reusableBlock;
		if ( ! isTemporaryReusableBlock ) {
			reusableBlock = getEntityRecord( 'postType', 'wp_block', ref );
		}

		return {
			reusableBlock,
			blockSelectionStart: getBlockSelectionStart(),
			blockSelectionEnd: getBlockSelectionEnd(),
			isFetching: isResolving(
				'core',
				'getEntityRecord',
				[ 'postType', 'wp_block', ref ]
			),
			canUpdateBlock: (
				!! reusableBlock &&
				! isTemporaryReusableBlock &&
				!! canUser( 'update', 'blocks', ref )
			),
			settings: getEditorSettings(),
		};
	} ),
	withDispatch( ( dispatch ) => {
		const { clearSelectedBlock } = dispatch( 'core/block-editor' );

		return {
			clearSelectedBlock,
		};
	} ),
] )( ReusableBlockEdit );
