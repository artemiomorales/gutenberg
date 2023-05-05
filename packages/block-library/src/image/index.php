<?php
/**
 * Server-side rendering of the `core/image` block.
 *
 * @package WordPress
 */

/**
 * Renders the `core/image` block on the server,
 * adding a data-id attribute to the element if core/gallery has added on pre-render.
 *
 * @param  array  $attributes The block attributes.
 * @param  string $content    The block content.
 * @return string Returns the block content with the data-id attribute added.
 */
function render_block_core_image( $attributes, $content ) {

	$processor = new WP_HTML_Tag_Processor( $content );
	$processor->next_tag( 'img' );

	if ( $processor->get_attribute( 'src' ) === null ) {
		return '';
	}

	if ( isset( $attributes['data-id'] ) ) {
		// Add the data-id="$id" attribute to the img element
		// to provide backwards compatibility for the Gallery Block,
		// which now wraps Image Blocks within innerBlocks.
		// The data-id attribute is added in a core/gallery `render_block_data` hook.
		$processor->set_attribute( 'data-id', $attributes['data-id'] );
	}

	$link_destination = isset( $attributes['linkDestination'] ) ? $attributes['linkDestination'] : 'none';
	$enable_lightbox  = isset( $attributes['enableLightbox'] ) ? $attributes['enableLightbox'] : false;

	if ( 'none' === $link_destination && $enable_lightbox ) {

		$aria_label = 'Open image lightbox';
		if ( $processor->get_attribute( 'alt' ) ) {
			$aria_label .= ' - ' . $processor->get_attribute( 'alt' );
		}

		$background_color  = wp_get_global_styles( array( 'color', 'background' ) );
		$close_button_icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" focusable="false"><path d="M13 11.8l6.1-6.3-1-1-6.1 6.2-6.1-6.2-1 1 6.1 6.3-6.5 6.7 1 1 6.5-6.6 6.5 6.6 1-1z"></path></svg>';

		$content = $processor->get_updated_html();

		return
<<<HTML
			<div class="wp-lightbox-container"
				 data-wp-island=""
				 data-wp-context='{ "core": { "image": { "initialized": false, "lightboxEnabled": false, "lastFocusedElement": null } } }'>
					<button aria-haspopup="dialog" aria-label="$aria_label" data-wp-on.click="actions.core.image.showLightbox">
						$content
					</button>
					<div data-wp-body="" class="wp-lightbox-overlay"
						 aria-hidden="true"
						 data-wp-class.initialized="context.core.image.initialized"
						 data-wp-class.active="context.core.image.lightboxEnabled"
						 data-wp-bind.aria-hidden="!context.core.image.lightboxEnabled"
						 data-wp-effect="effects.core.image.initLightbox"
						 data-wp-on.keydown="actions.core.image.handleKeydown"
						 data-wp-on.mousewheel="actions.core.image.hideLightbox"
						 data-wp-on.click="actions.core.image.hideLightbox"
						 >
							$content
							<button aria-label="Close lightbox" class="close-button" data-wp-on.click="actions.core.image.hideLightbox">
								$close_button_icon
							</button>
							<div class="scrim" style="background-color: $background_color"></div>
					</div>
			</div>
HTML;
	}

	return $processor->get_updated_html();
}


/**
 * Registers the `core/image` block on server.
 */
function register_block_core_image() {

	wp_enqueue_script(
		'wp-interactivity-image',
		plugins_url( '../interactive-blocks/image.min.js', __FILE__ ),
		array( 'wp-interactivity-runtime' )
	);

	register_block_type_from_metadata(
		__DIR__ . '/image',
		array(
			'render_callback' => 'render_block_core_image',
		)
	);
}
add_action( 'init', 'register_block_core_image' );
