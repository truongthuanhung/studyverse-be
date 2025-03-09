import fs from 'fs';
import path from 'path';

export const initFolder = (folderName: string) => {
  if (!fs.existsSync(path.resolve(folderName))) {
    fs.mkdirSync(path.resolve(folderName), {
      recursive: true
    });
  }
};

export const getNameFromFullname = (fullname: string) => {
  const nameArray = fullname.split('.');
  return nameArray[0];
};

export const getExtension = (fullname: string) => {
  const namearr = fullname.split('.');
  return namearr[namearr.length - 1];
};

// Helper function to extract public ID from Cloudinary URL
export function extractPublicId(url: string): string | null {
  const regex = /\/upload\/v\d+\/(.+?)(?:\.[^.]+)?$/;
  const match = url.match(regex);
  return match ? match[1] : null;
}
