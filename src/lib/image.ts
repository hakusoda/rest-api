import { Image, createCanvas } from '@napi-rs/canvas';
export function get_image_accent_colour(image: Image) {
	const canvas = createCanvas(1, 1);
	const context = canvas.getContext('2d');
	context.drawImage(image, 1, 1);

	// doesn't work well, try https://github.com/rtcoder/dominant-color/blob/main/src/dominant-color.ts
	const { data } = context.getImageData(0, 0, 1, 1);
	return (data[2] | data[1] << 8 | data[0] << 16) | 1 << 24;
}

export async function process_avatar_image(image: ArrayBuffer) {
	const img = new Image();
	img.src = Buffer.from(image);

	let width = 256, height = 256;
	if (img.naturalWidth > img.naturalHeight)
		width = img.naturalWidth * (256 / img.naturalHeight);
	else if (img.naturalHeight > img.naturalWidth)
		height = img.naturalHeight * (256 / img.naturalWidth);

	const canvas = createCanvas(256, 256);
	const context = canvas.getContext('2d');
	context.drawImage(img, -width / 2 + 128, -height / 2 + 128, width, height);

	return {
		data: await canvas.encode('avif', { quality: 100 }),
		format: 'avif',
		accent_colour: get_image_accent_colour(img)
	};
}