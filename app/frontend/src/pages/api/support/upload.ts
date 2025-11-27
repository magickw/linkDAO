import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import axios from 'axios';

export const config = {
  api: {
    bodyParser: false,
  },
};



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
    
    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const fileBuffer = fs.readFileSync(file.filepath);
    
    // Use Pinata API directly
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), file.originalFilename || 'upload');
    
    const headers: Record<string, string> = {};
    if (process.env.PINATA_API_KEY && process.env.PINATA_API_KEY_SECRET) {
      headers['pinata_api_key'] = process.env.PINATA_API_KEY;
      headers['pinata_secret_api_key'] = process.env.PINATA_API_KEY_SECRET;
    } else if (process.env.PINATA_JWT) {
      headers['Authorization'] = `Bearer ${process.env.PINATA_JWT}`;
    }

    const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      headers: {
        ...headers,
        'Content-Type': 'multipart/form-data',
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    fs.unlinkSync(file.filepath);

    res.status(200).json({
      success: true,
      data: {
        cid: response.data.IpfsHash,
        url: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
        size: fileBuffer.length,
        type: file.mimetype,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
}
