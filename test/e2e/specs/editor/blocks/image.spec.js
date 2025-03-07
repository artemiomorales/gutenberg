/**
 * External dependencies
 */
const path = require( 'path' );
const fs = require( 'fs/promises' );
const os = require( 'os' );
const { v4: uuid } = require( 'uuid' );

/** @typedef {import('@playwright/test').Page} Page */

/**
 * WordPress dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

test.use( {
	imageBlockUtils: async ( { page }, use ) => {
		await use( new ImageBlockUtils( { page } ) );
	},
} );

test.describe( 'Image', () => {
	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia();
	} );

	test.beforeEach( async ( { admin } ) => {
		await admin.createNewPost();
	} );

	test.afterEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia();
	} );

	test( 'can be inserted', async ( { editor, imageBlockUtils } ) => {
		await editor.insertBlock( { name: 'core/image' } );

		const imageBlock = editor.canvas.locator(
			'role=document[name="Block: Image"i]'
		);
		await expect( imageBlock ).toBeVisible();

		const filename = await imageBlockUtils.upload(
			imageBlock.locator( 'data-testid=form-file-upload-input' )
		);

		const image = imageBlock.locator( 'role=img' );
		await expect( image ).toBeVisible();
		await expect( image ).toHaveAttribute( 'src', new RegExp( filename ) );

		const regex = new RegExp(
			`<!-- wp:image {"id":(\\d+),"sizeSlug":"full","linkDestination":"none"} -->
<figure class="wp-block-image size-full"><img src="[^"]+\\/${ filename }\\.png" alt="" class="wp-image-\\1"/></figure>
<!-- \\/wp:image -->`
		);
		expect( await editor.getEditedPostContent() ).toMatch( regex );
	} );

	test( 'should replace, reset size, and keep selection', async ( {
		editor,
		page,
		imageBlockUtils,
	} ) => {
		await editor.insertBlock( { name: 'core/image' } );

		const imageBlock = editor.canvas.locator(
			'role=document[name="Block: Image"i]'
		);
		const image = imageBlock.locator( 'role=img' );

		const filename = await imageBlockUtils.upload(
			imageBlock.locator( 'data-testid=form-file-upload-input' )
		);

		{
			await expect( image ).toBeVisible();
			await expect( image ).toHaveAttribute(
				'src',
				new RegExp( filename )
			);

			const regex = new RegExp(
				`<!-- wp:image {"id":(\\d+),"sizeSlug":"full","linkDestination":"none"} -->
<figure class="wp-block-image size-full"><img src="[^"]+\\/${ filename }\\.png" alt="" class="wp-image-\\1"/></figure>
<!-- \\/wp:image -->`
			);
			expect( await editor.getEditedPostContent() ).toMatch( regex );
		}

		{
			await editor.openDocumentSettingsSidebar();
			await page.click(
				'role=group[name="Image size presets"i] >> role=button[name="25%"i]'
			);

			await expect( image ).toHaveCSS( 'width', '3px' );
			await expect( image ).toHaveCSS( 'height', '3px' );

			const regex = new RegExp(
				`<!-- wp:image {"id":(\\d+),"width":3,"height":3,"sizeSlug":"full","linkDestination":"none"} -->
<figure class="wp-block-image size-full is-resized"><img src="[^"]+\\/${ filename }\\.png" alt="" class="wp-image-\\1" width="3" height="3"\\/><\\/figure>
<!-- /wp:image -->`
			);

			expect( await editor.getEditedPostContent() ).toMatch( regex );
		}

		{
			await editor.showBlockToolbar();
			await page.click( 'role=button[name="Replace"i]' );

			const replacedFilename = await imageBlockUtils.upload(
				page
					// Ideally the menu should have the name of "Replace" but is currently missing.
					// Hence, we fallback to using CSS classname instead.
					.locator( '.block-editor-media-replace-flow__options' )
					.locator( 'data-testid=form-file-upload-input' )
			);

			await expect( image ).toHaveAttribute(
				'src',
				new RegExp( replacedFilename )
			);
			await expect( image ).toBeVisible();

			const regex = new RegExp(
				`<!-- wp:image {"id":(\\d+),"sizeSlug":"full","linkDestination":"none"} -->
<figure class="wp-block-image size-full"><img src="[^"]+\\/${ replacedFilename }\\.png" alt="" class="wp-image-\\1"/></figure>
<!-- \\/wp:image -->`
			);
			expect( await editor.getEditedPostContent() ).toMatch( regex );
		}

		{
			// Focus outside the block to avoid the image caption being selected
			// It can happen on CI specially.
			await editor.canvas.click( 'role=textbox[name="Add title"i]' );
			await image.click();
			await page.keyboard.press( 'Backspace' );

			expect( await editor.getEditedPostContent() ).toBe( '' );
		}
	} );

	test( 'should place caret on caption when clicking to add one', async ( {
		editor,
		page,
		imageBlockUtils,
	} ) => {
		await editor.insertBlock( { name: 'core/image' } );

		const imageBlock = editor.canvas.locator(
			'role=document[name="Block: Image"i]'
		);
		const image = imageBlock.locator( 'role=img' );

		const filename = await imageBlockUtils.upload(
			imageBlock.locator( 'data-testid=form-file-upload-input' )
		);
		await expect( image ).toHaveAttribute( 'src', new RegExp( filename ) );
		await editor.clickBlockToolbarButton( 'Add caption' );
		await page.keyboard.type( '1' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.press( 'Backspace' );
		await page.keyboard.type( '2' );

		expect(
			await editor.canvas.evaluate(
				() => document.activeElement.innerHTML
			)
		).toBe( '12' );
	} );

	test( 'should allow soft line breaks in caption', async ( {
		editor,
		page,
		imageBlockUtils,
	} ) => {
		await editor.insertBlock( { name: 'core/image' } );

		const imageBlock = editor.canvas.locator(
			'role=document[name="Block: Image"i]'
		);
		const image = imageBlock.locator( 'role=img' );

		const fileName = await imageBlockUtils.upload(
			imageBlock.locator( 'data-testid=form-file-upload-input' )
		);

		await expect( image ).toBeVisible();
		await expect( image ).toHaveAttribute( 'src', new RegExp( fileName ) );
		await editor.clickBlockToolbarButton( 'Add caption' );
		await page.keyboard.type( '12' );
		await page.keyboard.press( 'ArrowLeft' );
		await page.keyboard.press( 'Enter' );

		expect(
			await editor.canvas.evaluate(
				() => document.activeElement.innerHTML
			)
		).toBe( '1<br data-rich-text-line-break="true">2' );
	} );

	test( 'should have keyboard navigable toolbar for caption', async ( {
		editor,
		page,
		pageUtils,
		imageBlockUtils,
	} ) => {
		await editor.insertBlock( { name: 'core/image' } );

		const imageBlock = editor.canvas.locator(
			'role=document[name="Block: Image"i]'
		);
		const image = imageBlock.locator( 'role=img' );

		const fileName = await imageBlockUtils.upload(
			imageBlock.locator( 'data-testid=form-file-upload-input' )
		);

		await expect( image ).toBeVisible();
		await expect( image ).toHaveAttribute( 'src', new RegExp( fileName ) );

		// Add caption and navigate to inline toolbar.
		await editor.clickBlockToolbarButton( 'Add caption' );
		await pageUtils.pressKeys( 'shift+Tab' );
		expect(
			await page.evaluate( () =>
				document.activeElement.getAttribute( 'aria-label' )
			)
		).toBe( 'Bold' );

		// Bold to italic,
		await page.keyboard.press( 'ArrowRight' );
		// Italic to link,
		await page.keyboard.press( 'ArrowRight' );
		// Link to italic,
		await page.keyboard.press( 'ArrowLeft' );
		// Italic to bold.
		await page.keyboard.press( 'ArrowLeft' );
		expect(
			await page.evaluate( () =>
				document.activeElement.getAttribute( 'aria-label' )
			)
		).toBe( 'Bold' );

		await page.keyboard.press( 'Space' );
		await page.keyboard.press( 'a' );
		await page.keyboard.press( 'ArrowRight' );

		expect(
			await editor.canvas.evaluate(
				() => document.activeElement.innerHTML
			)
		).toBe( '<strong>a</strong>' );
	} );

	test( 'should drag and drop files into media placeholder', async ( {
		editor,
		page,
		imageBlockUtils,
	} ) => {
		await editor.insertBlock( { name: 'core/image' } );

		const imageBlock = editor.canvas.locator(
			'role=document[name="Block: Image"i]'
		);
		const image = imageBlock.locator( 'role=img' );

		const tmpInput = await page.evaluateHandle( () => {
			const input = document.createElement( 'input' );
			input.type = 'file';
			return input;
		} );

		const fileName = await imageBlockUtils.upload( tmpInput );

		const paragraphRect = await imageBlock.boundingBox();
		const pX = paragraphRect.x + paragraphRect.width / 2;
		const pY = paragraphRect.y + paragraphRect.height / 3;

		await imageBlock.evaluate(
			( element, [ input, clientX, clientY ] ) => {
				const dataTransfer = new window.DataTransfer();
				dataTransfer.items.add( input.files[ 0 ] );
				const event = new window.DragEvent( 'drop', {
					bubbles: true,
					clientX,
					clientY,
					dataTransfer,
				} );
				element.dispatchEvent( event );
			},
			[ tmpInput, pX, pY ]
		);

		await expect( image ).toHaveAttribute( 'src', new RegExp( fileName ) );
	} );

	test( 'allows zooming using the crop tools', async ( {
		editor,
		page,
		pageUtils,
		imageBlockUtils,
	} ) => {
		// Insert the block, upload a file and crop.
		await editor.insertBlock( { name: 'core/image' } );

		const imageBlock = editor.canvas.locator(
			'role=document[name="Block: Image"i]'
		);
		const image = imageBlock.locator( 'role=img' );

		const filename = await imageBlockUtils.upload(
			imageBlock.locator( 'data-testid=form-file-upload-input' )
		);

		await expect( image ).toHaveAttribute( 'src', new RegExp( filename ) );

		// Assert that the image is initially unscaled and unedited.
		const initialImageSrc = await image.getAttribute( 'src' );
		await expect
			.poll( () => image.boundingBox() )
			.toMatchObject( {
				height: 10,
				width: 10,
			} );

		// Zoom in to twice the amount using the zoom input.
		await editor.clickBlockToolbarButton( 'Crop' );
		await editor.clickBlockToolbarButton( 'Zoom' );
		await expect(
			page.locator( 'role=slider[name="Zoom"i]' )
		).toBeFocused();

		await pageUtils.pressKeys( 'Tab' );
		await expect(
			page.locator( 'role=spinbutton[name="Zoom"i]' )
		).toBeFocused();

		await pageUtils.pressKeys( 'primary+a' );
		await page.keyboard.type( '200' );
		await page.keyboard.press( 'Escape' );
		await editor.clickBlockToolbarButton( 'Apply' );

		// Wait for the cropping tools to disappear.
		await expect(
			page.locator( 'role=button[name="Save"i]' )
		).toBeHidden();

		// Assert that the image is edited.
		const updatedImageSrc = await image.getAttribute( 'src' );
		expect( initialImageSrc ).not.toEqual( updatedImageSrc );

		await expect
			.poll( () => image.boundingBox() )
			.toMatchObject( {
				height: 5,
				width: 5,
			} );

		expect(
			await imageBlockUtils.getImageBuffer( updatedImageSrc )
		).toMatchSnapshot();
	} );

	test( 'allows changing aspect ratio using the crop tools', async ( {
		editor,
		page,
		imageBlockUtils,
	} ) => {
		// Insert the block, upload a file and crop.
		await editor.insertBlock( { name: 'core/image' } );

		const imageBlock = editor.canvas.locator(
			'role=document[name="Block: Image"i]'
		);
		const image = imageBlock.locator( 'role=img' );

		const filename = await imageBlockUtils.upload(
			imageBlock.locator( 'data-testid=form-file-upload-input' )
		);

		await expect( image ).toHaveAttribute( 'src', new RegExp( filename ) );

		// Assert that the image is initially unscaled and unedited.
		const initialImageSrc = await image.getAttribute( 'src' );
		await expect
			.poll( () => image.boundingBox() )
			.toMatchObject( {
				height: 10,
				width: 10,
			} );

		// Zoom in to twice the amount using the zoom input.
		await editor.clickBlockToolbarButton( 'Crop' );
		await editor.clickBlockToolbarButton( 'Aspect Ratio' );
		await page.click(
			'role=menu[name="Aspect Ratio"i] >> role=menuitemradio[name="16:10"i]'
		);
		await editor.clickBlockToolbarButton( 'Apply' );

		// Wait for the cropping tools to disappear.
		await expect(
			page.locator( 'role=button[name="Save"i]' )
		).toBeHidden();

		// Assert that the image is edited.
		const updatedImageSrc = await image.getAttribute( 'src' );
		expect( updatedImageSrc ).not.toEqual( initialImageSrc );

		await expect
			.poll( () => image.boundingBox() )
			.toMatchObject( {
				height: 6,
				width: 10,
			} );

		expect(
			await imageBlockUtils.getImageBuffer( updatedImageSrc )
		).toMatchSnapshot();
	} );

	test( 'allows rotating using the crop tools', async ( {
		editor,
		page,
		imageBlockUtils,
	} ) => {
		// Insert the block, upload a file and crop.
		await editor.insertBlock( { name: 'core/image' } );

		const imageBlock = editor.canvas.locator(
			'role=document[name="Block: Image"i]'
		);
		const image = imageBlock.locator( 'role=img' );

		const filename = await imageBlockUtils.upload(
			imageBlock.locator( 'data-testid=form-file-upload-input' )
		);

		await expect( image ).toHaveAttribute( 'src', new RegExp( filename ) );

		// Rotate the image.
		await editor.clickBlockToolbarButton( 'Crop' );
		await editor.clickBlockToolbarButton( 'Rotate' );
		await editor.clickBlockToolbarButton( 'Apply' );

		// Wait for the cropping tools to disappear.
		await expect(
			page.locator( 'role=button[name="Save"i]' )
		).toBeHidden();

		// Assert that the image is edited.
		const updatedImageSrc = await image.getAttribute( 'src' );

		expect(
			await imageBlockUtils.getImageBuffer( updatedImageSrc )
		).toMatchSnapshot();
	} );

	test( 'Should reset dimensions on change URL', async ( {
		editor,
		page,
		imageBlockUtils,
	} ) => {
		await editor.insertBlock( { name: 'core/image' } );

		const imageBlock = editor.canvas.locator(
			'role=document[name="Block: Image"i]'
		);
		const image = imageBlock.locator( 'role=img' );

		{
			// Upload an initial image.
			const filename = await imageBlockUtils.upload(
				imageBlock.locator( 'data-testid=form-file-upload-input' )
			);
			await expect( image ).toHaveAttribute(
				'src',
				new RegExp( filename )
			);

			// Resize the Uploaded Image.
			await editor.openDocumentSettingsSidebar();
			await page.click(
				'role=group[name="Image size presets"i] >> role=button[name="25%"i]'
			);

			const regex = new RegExp(
				`<!-- wp:image {"id":(\\d+),"width":3,"height":3,"sizeSlug":"full","linkDestination":"none"} -->
<figure class="wp-block-image size-full is-resized"><img src="[^"]+/${ filename }\\.png" alt="" class="wp-image-\\1" width="3" height="3"/></figure>
<!-- /wp:image -->`
			);

			// Check if dimensions are changed.
			expect( await editor.getEditedPostContent() ).toMatch( regex );
		}

		{
			const imageUrl = '/wp-includes/images/w-logo-blue.png';

			// Replace uploaded image with an URL.
			await editor.clickBlockToolbarButton( 'Replace' );
			await page.click( 'role=button[name="Edit"i]' );
			// Replace the url.
			await page.fill( 'role=combobox[name="URL"i]', imageUrl );
			await page.click( 'role=button[name="Save"i]' );

			const regex = new RegExp(
				`<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="${ imageUrl }" alt=""/></figure>
<!-- /wp:image -->`
			);

			// Check if dimensions are reset.
			expect( await editor.getEditedPostContent() ).toMatch( regex );
		}
	} );

	test( 'should undo without broken temporary state', async ( {
		editor,
		pageUtils,
		imageBlockUtils,
	} ) => {
		await editor.insertBlock( { name: 'core/image' } );

		const imageBlock = editor.canvas.locator(
			'role=document[name="Block: Image"i]'
		);
		const image = imageBlock.locator( 'role=img' );

		const filename = await imageBlockUtils.upload(
			imageBlock.locator( 'data-testid=form-file-upload-input' )
		);

		await expect( image ).toHaveAttribute( 'src', new RegExp( filename ) );
		await editor.canvas.focus( '.wp-block-image' );
		await pageUtils.pressKeys( 'primary+z' );

		// Expect an empty image block (placeholder) rather than one with a
		// broken temporary URL.
		expect( await editor.getEditedPostContent() ).toBe( `<!-- wp:image -->
<figure class="wp-block-image"><img alt=""/></figure>
<!-- /wp:image -->` );
	} );

	test( 'can be replaced by dragging-and-dropping images from the inserter', async ( {
		page,
		editor,
	} ) => {
		// To do: run with iframe.
		await page.evaluate( () => {
			window.wp.blocks.registerBlockType( 'test/v2', {
				apiVersion: '2',
				title: 'test',
			} );
		} );
		await editor.insertBlock( { name: 'core/image' } );
		const imageBlock = editor.canvas.getByRole( 'document', {
			name: 'Block: Image',
		} );
		const blockLibrary = page.getByRole( 'region', {
			name: 'Block Library',
		} );

		async function openMediaTab() {
			const blockInserter = page.getByRole( 'button', {
				name: 'Toggle block inserter',
			} );
			const isClosed =
				( await blockInserter.getAttribute( 'aria-pressed' ) ) ===
				'false';

			if ( isClosed ) {
				await blockInserter.click();
			}

			await blockLibrary.getByRole( 'tab', { name: 'Media' } ).click();

			await blockLibrary
				.getByRole( 'tabpanel', { name: 'Media' } )
				.getByRole( 'button', { name: 'Openverse' } )
				.click();
		}

		await openMediaTab();

		// Drag the first image from the media library into the image block.
		await blockLibrary
			.getByRole( 'listbox', { name: 'Media List' } )
			.getByRole( 'option' )
			.first()
			.dragTo( imageBlock );

		await expect( async () => {
			const blocks = await editor.getBlocks();
			expect( blocks ).toHaveLength( 1 );

			const [
				{
					attributes: { url },
				},
			] = blocks;
			expect(
				await imageBlock.getByRole( 'img' ).getAttribute( 'src' )
			).toBe( url );
			expect(
				new URL( url ).host,
				'should be updated to the media library'
			).toBe( new URL( page.url() ).host );
		}, 'should update the image from the media inserter' ).toPass();
		const [
			{
				attributes: { url: firstUrl },
			},
		] = await editor.getBlocks();

		await openMediaTab();

		// Drag the second image from the media library into the image block.
		await blockLibrary
			.getByRole( 'listbox', { name: 'Media List' } )
			.getByRole( 'option' )
			.nth( 1 )
			.dragTo( imageBlock );

		await expect( async () => {
			const blocks = await editor.getBlocks();
			expect( blocks ).toHaveLength( 1 );

			const [
				{
					attributes: { url },
				},
			] = blocks;
			expect( url ).not.toBe( firstUrl );
			expect(
				await imageBlock.getByRole( 'img' ).getAttribute( 'src' )
			).toBe( url );
			expect(
				new URL( url ).host,
				'should be updated to the media library'
			).toBe( new URL( page.url() ).host );
		}, 'should replace the original image with the second image' ).toPass();
	} );

	test( 'should allow dragging and dropping HTML to media placeholder', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( { name: 'core/image' } );
		const imageBlock = editor.canvas.getByRole( 'document', {
			name: 'Block: Image',
		} );

		const html = `
			<figure>
				<img src="https://live.staticflickr.com/3894/14962688165_04759a8b03_b.jpg" alt="Cat">
				<figcaption>"Cat" by tomhouslay is licensed under <a href="https://creativecommons.org/licenses/by-nc/2.0/?ref=openverse">CC BY-NC 2.0</a>.</figcaption>
			</figure>
		`;

		await page.evaluate( ( _html ) => {
			const dummy = document.createElement( 'div' );
			dummy.style.width = '10px';
			dummy.style.height = '10px';
			dummy.style.zIndex = 99999;
			dummy.style.position = 'fixed';
			dummy.style.top = 0;
			dummy.style.left = 0;
			dummy.draggable = 'true';
			dummy.addEventListener( 'dragstart', ( event ) => {
				event.dataTransfer.setData( 'text/html', _html );
				setTimeout( () => {
					dummy.remove();
				}, 0 );
			} );
			document.body.appendChild( dummy );
		}, html );

		await page.mouse.move( 0, 0 );
		await page.mouse.down();
		await imageBlock.hover();
		await page.mouse.up();

		const host = new URL( page.url() ).host;

		await expect.poll( editor.getBlocks ).toMatchObject( [
			{
				name: 'core/image',
				attributes: {
					link: expect.stringContaining( host ),
					url: expect.stringContaining( host ),
					id: expect.any( Number ),
					alt: 'Cat',
					caption: `"Cat" by tomhouslay is licensed under <a href="https://creativecommons.org/licenses/by-nc/2.0/?ref=openverse">CC BY-NC 2.0</a>.`,
				},
			},
		] );
		const url = ( await editor.getBlocks() )[ 0 ].attributes.url;
		await expect( imageBlock.getByRole( 'img' ) ).toHaveAttribute(
			'src',
			url
		);
	} );

	test( 'should appear in the frontend published post content', async ( {
		editor,
		imageBlockUtils,
		page,
	} ) => {
		await editor.insertBlock( { name: 'core/image' } );
		const imageBlock = editor.canvas.locator(
			'role=document[name="Block: Image"i]'
		);
		await expect( imageBlock ).toBeVisible();

		const filename = await imageBlockUtils.upload(
			imageBlock.locator( 'data-testid=form-file-upload-input' )
		);

		const imageInEditor = imageBlock.locator( 'role=img' );
		await expect( imageInEditor ).toBeVisible();
		await expect( imageInEditor ).toHaveAttribute(
			'src',
			new RegExp( filename )
		);

		const postId = await editor.publishPost();
		await page.goto( `/?p=${ postId }` );

		const figureDom = page.getByRole( 'figure' );
		await expect( figureDom ).toBeVisible();

		const imageDom = figureDom.locator( 'img' );
		await expect( imageDom ).toBeVisible();
		await expect( imageDom ).toHaveAttribute(
			'src',
			new RegExp( filename )
		);
	} );
} );

test.describe( 'Image - interactivity', () => {
	let filename = null;

	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia();
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia();
	} );

	test.beforeEach( async ( { admin, page, editor, imageBlockUtils } ) => {
		await admin.visitAdminPage(
			'/admin.php',
			'page=gutenberg-experiments'
		);

		await page
			.locator( `#gutenberg-interactivity-api-core-blocks` )
			.setChecked( true );

		await page.locator( `input[name="submit"]` ).click();
		await page.waitForLoadState();

		await admin.createNewPost();
		await editor.insertBlock( { name: 'core/image' } );

		const imageBlock = editor.canvas.locator(
			'role=document[name="Block: Image"i]'
		);
		await expect( imageBlock ).toBeVisible();

		filename = await imageBlockUtils.upload(
			imageBlock.locator( 'data-testid=form-file-upload-input' )
		);
		const image = imageBlock.locator( 'role=img' );
		await expect( image ).toBeVisible();
		await expect( image ).toHaveAttribute( 'src', new RegExp( filename ) );

		await editor.openDocumentSettingsSidebar();
	} );

	test.afterEach( async ( { requestUtils, admin, page } ) => {
		await requestUtils.deleteAllMedia();

		await admin.visitAdminPage(
			'/admin.php',
			'page=gutenberg-experiments'
		);

		await page
			.locator( `#gutenberg-interactivity-api-core-blocks` )
			.setChecked( false );

		await page.locator( `input[name="submit"]` ).click();

		await page.waitForLoadState();
	} );

	test( 'should toggle "lightbox" in saved attributes', async ( {
		editor,
		page,
	} ) => {
		await page.getByRole( 'button', { name: 'Advanced' } ).click();
		await page
			.getByRole( 'combobox', { name: 'Behaviors' } )
			.selectOption( 'lightbox' );

		let blocks = await editor.getBlocks();
		expect( blocks[ 0 ].attributes ).toMatchObject( {
			behaviors: { lightbox: true },
			linkDestination: 'none',
		} );
		expect( blocks[ 0 ].attributes.url ).toContain( filename );

		await page.getByLabel( 'Behaviors' ).selectOption( '' );
		blocks = await editor.getBlocks();
		expect( blocks[ 0 ].attributes ).toMatchObject( {
			behaviors: { lightbox: false },
			linkDestination: 'none',
		} );
		expect( blocks[ 0 ].attributes.url ).toContain( filename );
	} );

	test( 'should open and close the image in a lightbox using the mouse', async ( {
		editor,
		page,
	} ) => {
		await page.getByRole( 'button', { name: 'Advanced' } ).click();
		await page
			.getByRole( 'combobox', { name: 'Behaviors' } )
			.selectOption( 'lightbox' );

		const postId = await editor.publishPost();
		await page.goto( `/?p=${ postId }` );

		const lightbox = page.locator( '.wp-lightbox-overlay' );
		await expect( lightbox ).toBeHidden();

		const image = lightbox.locator( 'img' );
		await expect( image ).toHaveAttribute( 'src', new RegExp( filename ) );

		await page.getByRole( 'button', { name: 'Enlarge image' } ).click();

		await expect( lightbox ).toBeVisible();

		const closeButton = lightbox.getByRole( 'button', {
			name: 'Close',
		} );
		await closeButton.click();

		await expect( lightbox ).toBeHidden();
	} );

	test.describe( 'keyboard navigation', () => {
		let openLightboxButton;
		let lightbox;
		let closeButton;

		test.beforeEach( async ( { page, editor } ) => {
			await page.getByRole( 'button', { name: 'Advanced' } ).click();
			await page
				.getByRole( 'combobox', { name: 'Behaviors' } )
				.selectOption( 'lightbox' );

			const postId = await editor.publishPost();
			await page.goto( `/?p=${ postId }` );

			openLightboxButton = page.getByRole( 'button', {
				name: 'Enlarge image',
			} );
			lightbox = page.getByRole( 'dialog' );
			closeButton = lightbox.getByRole( 'button', {
				name: 'Close',
			} );
		} );

		test( 'should open and focus appropriately using enter key', async ( {
			page,
		} ) => {
			// Open and close lightbox using the close button
			await openLightboxButton.focus();
			await page.keyboard.press( 'Enter' );
			await expect( lightbox ).toBeVisible();
			await expect( closeButton ).toBeFocused();
		} );

		test( 'should close and focus appropriately using enter key on close button', async ( {
			page,
		} ) => {
			// Open and close lightbox using the close button
			await openLightboxButton.focus();
			await page.keyboard.press( 'Enter' );
			await expect( lightbox ).toBeVisible();
			await expect( closeButton ).toBeFocused();
			await page.keyboard.press( 'Enter' );
			await expect( lightbox ).toBeHidden();
			await expect( openLightboxButton ).toBeFocused();
		} );

		test( 'should close and focus appropriately using escape key', async ( {
			page,
		} ) => {
			await openLightboxButton.focus();
			await page.keyboard.press( 'Enter' );
			await expect( lightbox ).toBeVisible();
			await expect( closeButton ).toBeFocused();
			await page.keyboard.press( 'Escape' );
			await expect( lightbox ).toBeHidden();
			await expect( openLightboxButton ).toBeFocused();
		} );

		// TO DO: Add these tests, which will involve adding a caption
		// to uploaded test images
		// test( 'should trap focus appropriately when using tab', async ( {
		// 	page,
		// } ) => {

		// } );

		// test( 'should trap focus appropriately using shift+tab', async ( {
		// 	page,
		// } ) => {

		// } );
	} );
} );

class ImageBlockUtils {
	constructor( { page } ) {
		/** @type {Page} */
		this.page = page;

		this.TEST_IMAGE_FILE_PATH = path.join(
			__dirname,
			'..',
			'..',
			'..',
			'assets',
			'10x10_e2e_test_image_z9T8jK.png'
		);
	}

	async upload( inputElement ) {
		const tmpDirectory = await fs.mkdtemp(
			path.join( os.tmpdir(), 'gutenberg-test-image-' )
		);
		const filename = uuid();
		const tmpFileName = path.join( tmpDirectory, filename + '.png' );
		await fs.copyFile( this.TEST_IMAGE_FILE_PATH, tmpFileName );

		await inputElement.setInputFiles( tmpFileName );

		return filename;
	}

	async getImageBuffer( url ) {
		const response = await this.page.request.get( url );
		return await response.body();
	}

	async getHexString( element ) {
		return element.evaluate( ( node ) => {
			const canvas = document.createElement( 'canvas' );
			canvas.width = node.width;
			canvas.height = node.height;

			const context = canvas.getContext( '2d' );
			context.drawImage( node, 0, 0 );
			const imageData = context.getImageData(
				0,
				0,
				canvas.width,
				canvas.height
			);
			const pixels = imageData.data;

			let hexString = '';
			for ( let i = 0; i < pixels.length; i += 4 ) {
				if ( i !== 0 && i % ( canvas.width * 4 ) === 0 ) {
					hexString += '\n';
				}

				const r = pixels[ i ].toString( 16 ).padStart( 2, '0' );
				const g = pixels[ i + 1 ].toString( 16 ).padStart( 2, '0' );
				const b = pixels[ i + 2 ].toString( 16 ).padStart( 2, '0' );
				const a = pixels[ i + 3 ].toString( 16 ).padStart( 2, '0' );
				hexString += '#' + r + g + b + a;
			}
			return hexString;
		} );
	}
}
