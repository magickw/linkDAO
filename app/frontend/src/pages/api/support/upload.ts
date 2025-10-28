import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { create } from 'ipfs-http-client';

export const config = {
  api: {
    bodyParser: false,
  },
};

const ipfs = create({ url: process.env.IPFS_URL || 'http://localhost:5001' });

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
    const result = await ipfs.add(fileBuffer);

    fs.unlinkSync(file.filepath);

    res.status(200).json({
      success: true,
      data: {
        cid: result.cid.toString(),
        url: `https://ipfs.io/ipfs/${result.cid.toString()}`,
        size: result.size,
        type: file.mimetype,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
}
