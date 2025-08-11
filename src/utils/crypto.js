import CryptoJS from 'crypto-js';

// 密码加密密钥（在实际生产环境中应该使用环境变量）
const SECRET_KEY = 'oss-tool-secret-key-2024';

/**
 * 加密密码
 * @param {string} password - 明文密码
 * @returns {string} 加密后的密码
 */
export const encryptPassword = (password) => {
  return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
};

/**
 * 解密密码
 * @param {string} encryptedPassword - 加密的密码
 * @returns {string} 明文密码
 */
export const decryptPassword = (encryptedPassword) => {
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * 验证密码
 * @param {string} inputPassword - 用户输入的明文密码
 * @param {string} storedPassword - 存储的加密密码
 * @returns {boolean} 密码是否匹配
 */
export const verifyPassword = (inputPassword, storedPassword) => {
  try {
    const decrypted = decryptPassword(storedPassword);
    return inputPassword === decrypted;
  } catch (error) {
    console.error('密码验证失败:', error);
    return false;
  }
};

/**
 * 生成随机盐值
 * @returns {string} 随机盐值
 */
export const generateSalt = () => {
  return CryptoJS.lib.WordArray.random(128/8).toString();
};

/**
 * 使用盐值加密密码（更安全的方式）
 * @param {string} password - 明文密码
 * @param {string} salt - 盐值
 * @returns {string} 加密后的密码
 */
export const encryptPasswordWithSalt = (password, salt) => {
  const saltedPassword = password + salt;
  return CryptoJS.AES.encrypt(saltedPassword, SECRET_KEY).toString();
};

/**
 * 使用盐值验证密码
 * @param {string} inputPassword - 用户输入的明文密码
 * @param {string} storedPassword - 存储的加密密码
 * @param {string} salt - 盐值
 * @returns {boolean} 密码是否匹配
 */
export const verifyPasswordWithSalt = (inputPassword, storedPassword, salt) => {
  try {
    const saltedPassword = inputPassword + salt;
    const encrypted = CryptoJS.AES.encrypt(saltedPassword, SECRET_KEY).toString();
    return encrypted === storedPassword;
  } catch (error) {
    console.error('密码验证失败:', error);
    return false;
  }
};

/**
 * 加密OSS配置信息
 * @param {Object} config - OSS配置对象
 * @returns {Object} 加密后的配置对象
 */
export const encryptOSSConfig = (config) => {
  const encryptedConfig = { ...config };
  
  // 只加密敏感信息
  if (config.accessKeyId) {
    encryptedConfig.accessKeyId = CryptoJS.AES.encrypt(config.accessKeyId, SECRET_KEY).toString();
  }
  if (config.accessKeySecret) {
    encryptedConfig.accessKeySecret = CryptoJS.AES.encrypt(config.accessKeySecret, SECRET_KEY).toString();
  }
  
  return encryptedConfig;
};

/**
 * 解密OSS配置信息
 * @param {Object} encryptedConfig - 加密的OSS配置对象
 * @returns {Object} 解密后的配置对象
 */
export const decryptOSSConfig = (encryptedConfig) => {
  try {
    const decryptedConfig = { ...encryptedConfig };
    
    // 解密敏感信息
    if (encryptedConfig.accessKeyId) {
      const bytes = CryptoJS.AES.decrypt(encryptedConfig.accessKeyId, SECRET_KEY);
      decryptedConfig.accessKeyId = bytes.toString(CryptoJS.enc.Utf8);
    }
    if (encryptedConfig.accessKeySecret) {
      const bytes = CryptoJS.AES.decrypt(encryptedConfig.accessKeySecret, SECRET_KEY);
      decryptedConfig.accessKeySecret = bytes.toString(CryptoJS.enc.Utf8);
    }
    
    return decryptedConfig;
  } catch (error) {
    console.error('OSS配置解密失败:', error);
    return encryptedConfig; // 返回原始配置，避免应用崩溃
  }
};

/**
 * 批量加密OSS配置列表
 * @param {Array} configs - OSS配置列表
 * @returns {Array} 加密后的配置列表
 */
export const encryptOSSConfigs = (configs) => {
  return configs.map(config => encryptOSSConfig(config));
};

/**
 * 批量解密OSS配置列表
 * @param {Array} encryptedConfigs - 加密的OSS配置列表
 * @returns {Array} 解密后的配置列表
 */
export const decryptOSSConfigs = (encryptedConfigs) => {
  return encryptedConfigs.map(config => decryptOSSConfig(config));
};