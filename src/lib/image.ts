import { Image, createCanvas } from '@napi-rs/canvas';

export const DEFAULT_IMAGE_ENCODING_FORMAT = 'avif';
export async function processAvatarImage(image: ArrayBuffer) {
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

	const format = DEFAULT_IMAGE_ENCODING_FORMAT;
	return {
		data: await canvas.encode(format, 100),
		format
	};
}