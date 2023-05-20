/**
 * Internal dependencies
 */
import { store } from '../utils/interactivity';

const raf = window.requestAnimationFrame;
// Until useSignalEffects is fixed: https://github.com/preactjs/signals/issues/228
const tick = () => new Promise( ( r ) => raf( () => raf( r ) ) );

store( {
	actions: {
		core: {
			image: {
				showLightbox: ( { context, event } ) => {
					context.core.image.initialized = true;
					context.core.image.lightboxEnabled = true;
					context.core.image.lastFocusedElement =
						window.document.activeElement;
					context.core.image.scrollPosition = window.scrollY;

					// Change css variables depending on the image.
					const { x: leftPosition, y: topPosition } =
						event.target.getBoundingClientRect();
					const scaleWidth =
						event.target.offsetWidth / event.target.naturalWidth;
					const scaleHeight =
						event.target.offsetHeight / event.target.naturalHeight;
					const root = document.documentElement;
					root.style.setProperty(
						'--lightbox-left-position',
						leftPosition + 'px'
					);
					root.style.setProperty(
						'--lightbox-top-position',
						topPosition + 'px'
					);
					root.style.setProperty(
						'--lightbox-scale-width',
						scaleWidth
					);
					root.style.setProperty(
						'--lightbox-scale-height',
						scaleHeight
					);
				},
				hideLightbox: ( { context, event } ) => {
					if ( context.core.image.lightboxEnabled ) {
						// Disable scroll until the zoom animation ends.
						// Get the current page scroll position
						const scrollTop =
							window.pageYOffset ||
							document.documentElement.scrollTop;
						const scrollLeft =
							window.pageXOffset ||
							document.documentElement.scrollLeft;
						// if any scroll is attempted, set this to the previous value.
						window.onscroll = function () {
							window.scrollTo( scrollLeft, scrollTop );
						};

						// Enable scrolling after the animation finishes
						setTimeout( function () {
							window.onscroll = function () {};
						}, 400 );

						context.core.image.lightboxEnabled = false;

						// We only want to focus the last focused element
						// if the lightbox was closed by the keyboard.
						// Note: Pressing Enter on a button will trigger
						// a click event with a blank pointerType.
						if (
							( event.key && event.type === 'keydown' ) ||
							( event.type === 'click' &&
								event.pointerType === '' )
						) {
							context.core.image.lastFocusedElement.focus();
						}
					}
				},
				handleKeydown: ( { context, actions, event } ) => {
					if ( context.core.image.lightboxEnabled ) {
						const isTabKeyPressed =
							event.key === 'Tab' || event.keyCode === 9;
						const escapeKeyPressed =
							event.key === 'Escape' || event.keyCode === 27;

						if ( isTabKeyPressed ) {
							event.preventDefault();
						}

						if ( escapeKeyPressed || isTabKeyPressed ) {
							actions.core.image.hideLightbox( {
								context,
								event,
							} );
						}
					}
				},
			},
		},
	},
	effects: {
		core: {
			image: {
				initLightbox: async ( { context, ref } ) => {
					if ( context.core.image.lightboxEnabled ) {
						// We need to wait until the DOM is able
						// to receive focus updates for accessibility
						await tick();
						ref.querySelector( '.close-button' ).focus();
					}
				},
			},
		},
	},
} );
