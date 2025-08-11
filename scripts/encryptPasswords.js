import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { encryptPassword } from '../src/utils/crypto.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 用户数据文件路径
const usersFilePath = path.join(__dirname, '../src/data/users.json');

// 读取用户数据
const usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));

console.log('开始加密用户密码...');

// 加密所有用户的密码
const encryptedUsers = usersData.map(user => {
  const originalPassword = user.password;
  const encryptedPassword = encryptPassword(originalPassword);
  
  console.log(`用户 ${user.username}: ${originalPassword} -> [已加密]`);
  
  return {
    ...user,
    password: encryptedPassword
  };
});

// 写入加密后的数据
fs.writeFileSync(usersFilePath, JSON.stringify(encryptedUsers, null, 2), 'utf8');

console.log('密码加密完成！');
console.log(`已更新文件: ${usersFilePath}`);