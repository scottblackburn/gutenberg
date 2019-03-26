/**
 * WordPress dependencies
 */
import { Component } from '@wordpress/element';
import { withSelect } from '@wordpress/data';

/**
 * Component which calls onBlockSelected prop when a block becomes selected. It
 * is assumed to be used in a separate registry context from the reusable block
 * in which it is rendered, ensuring that only one block appears as selected
 * between the editor in which the reusable resides and block's own editor.
 *
 * @type {WPComponent}
 */
class SelectionObserver extends Component {
	componentDidUpdate( prevProps ) {
		const { hasSelectedBlock, onBlockSelected } = this.props;
		if ( hasSelectedBlock && ! prevProps.hasSelectedBlock ) {
			onBlockSelected();
		}
	}

	render() {
		return null;
	}
}

export default withSelect( ( select ) => {
	const { hasSelectedBlock } = select( 'core/block-editor' );

	return {
		hasSelectedBlock: hasSelectedBlock(),
	};
} )( SelectionObserver );
