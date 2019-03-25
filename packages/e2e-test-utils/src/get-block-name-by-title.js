/**
 * Returns a string with the block name provided the block title.
 *
 * @param {string} title The block title.
 *
 * @return {Promise} Promise resolving with an string containing the block name.
 */
export function getBlockNameByTitle( title ) {
	return page.evaluate( ( _title ) => {
		const blockTypes = window.wp.data.select( 'core/blocks' ).getBlockTypes();
		const blockType = blockTypes.find( ( block ) => ( block.title === _title ) );
		return blockType && blockType.name;
	}, title );
}
