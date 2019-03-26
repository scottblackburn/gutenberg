/**
 * Internal dependencies
 */
import {
	convertBlockToReusable,
	convertBlockToStatic,
} from './effects/reusable-blocks';

export default {
	CONVERT_BLOCK_TO_STATIC: convertBlockToStatic,
	CONVERT_BLOCK_TO_REUSABLE: convertBlockToReusable,
};
