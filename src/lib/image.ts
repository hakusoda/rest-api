import { Image, createCanvas } from '@napi-rs/canvas';
export function processAvatarImage(image: ArrayBuffer) {
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

	return canvas.encode('webp', 100);
}