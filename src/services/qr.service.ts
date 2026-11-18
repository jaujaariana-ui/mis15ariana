import QRCode from 'qrcode';

export async function generateQRCode(
  text: string,
  options: {
    width?: number;
    color?: { dark: string; light: string };
  } = {}
): Promise<string> {
  return QRCode.toDataURL(text, {
    width: options.width || 300,
    margin: 2,
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#FFFFFF',
    },
  });
}

export async function generateQRCodePNG(
  text: string,
  options: {
    width?: number;
    color?: { dark: string; light: string };
  } = {}
): Promise<Buffer> {
  return QRCode.toBuffer(text, {
    type: 'png',
    width: options.width || 512,
    margin: 2,
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#FFFFFF',
    },
  });
}

export async function generateQRCodeWithLogo(
  text: string,
  eventName: string,
  options: {
    width?: number;
  } = {}
): Promise<Buffer> {
  // Generate QR code with higher error correction for potential logo overlay
  return QRCode.toBuffer(text, {
    type: 'png',
    width: options.width || 512,
    margin: 4,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#1a1a2e',
      light: '#FFFFFF',
    },
  });
}
