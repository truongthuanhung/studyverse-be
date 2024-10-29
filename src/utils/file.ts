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
