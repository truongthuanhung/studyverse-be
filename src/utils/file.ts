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
